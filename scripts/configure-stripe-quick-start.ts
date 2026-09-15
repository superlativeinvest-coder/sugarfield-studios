import Stripe from "stripe";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

loadEnvConfig(process.cwd());

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey || !secretKey.startsWith("sk_test_")) {
  throw new Error("This setup script only accepts a Stripe Sandbox test secret key (sk_test_...).");
}

async function main() {
  const stripe = new Stripe(secretKey!);
  const lookupKey = "pokopia_quick_start_pack_free_v1";
  const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
  const price = existing ?? await stripe.prices.create({
    currency: "usd",
    unit_amount: 0,
    lookup_key: lookupKey,
    product_data: { name: "Pokopia Quick Start Pack", metadata: { sugarfield_product_id: "FREE-QUICK-START", funnel: "pokopia_daily_reset", no_cost_order: "true" } },
    metadata: { sugarfield_product_id: "FREE-QUICK-START", funnel: "pokopia_daily_reset", no_cost_order: "true" },
  });

  const envPath = join(process.cwd(), ".env.local");
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `STRIPE_QUICK_START_PRICE_ID=${price.id}`;
  writeFileSync(envPath, /^STRIPE_QUICK_START_PRICE_ID=.*$/m.test(env) ? env.replace(/^STRIPE_QUICK_START_PRICE_ID=.*$/m, line) : `${env.trimEnd()}\n${line}\n`, "utf8");
  console.log(JSON.stringify({ priceId: price.id, lookupKey, amount: price.unit_amount, currency: price.currency }, null, 2));
  console.log("Saved STRIPE_QUICK_START_PRICE_ID to .env.local.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Quick Start Stripe setup failed.");
  process.exitCode = 1;
});
