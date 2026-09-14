import Stripe from "stripe";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

loadEnvConfig(process.cwd());

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error("STRIPE_SECRET_KEY is empty. Add your Stripe test key to .env.local, then run this command again.");
if (!secretKey.startsWith("sk_test_")) throw new Error("This setup script only accepts a Stripe test secret key (sk_test_...).");
const stripeSecretKey = secretKey;

async function main() {
  const stripe = new Stripe(stripeSecretKey);
  const lookupKey = "pokopia_mini_tool_v1";
  const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
  const price = existing ?? await stripe.prices.create({ currency: "usd", unit_amount: 399, lookup_key: lookupKey, product_data: { name: "Pokopia Event Tracker", metadata: { sugarfield_product_id: "P13", funnel: "pokopia_daily_reset", funnel_step: "mini_tool" } }, metadata: { sugarfield_product_id: "P13", funnel: "pokopia_daily_reset", funnel_step: "mini_tool" } });
  const envPath = join(process.cwd(), ".env.local");
  const existingEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const priceLine = `STRIPE_MINI_TOOL_PRICE_ID=${price.id}`;
  const updatedEnv = /^STRIPE_MINI_TOOL_PRICE_ID=.*$/m.test(existingEnv) ? existingEnv.replace(/^STRIPE_MINI_TOOL_PRICE_ID=.*$/m, priceLine) : `${existingEnv.trimEnd()}\n${priceLine}\n`;
  writeFileSync(envPath, updatedEnv, "utf8");
  console.log(JSON.stringify({ priceId: price.id, lookupKey, amount: price.unit_amount, currency: price.currency }, null, 2));
  console.log("Saved STRIPE_MINI_TOOL_PRICE_ID to .env.local.");
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Stripe setup failed."); process.exitCode = 1; });
