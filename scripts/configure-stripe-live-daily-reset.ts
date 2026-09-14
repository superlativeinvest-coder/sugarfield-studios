import Stripe from "stripe";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

loadEnvConfig(process.cwd());

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey?.startsWith("sk_live_")) throw new Error("STRIPE_SECRET_KEY must be a live Stripe secret key (sk_live_...).");
const configuredSecretKey = secretKey;

function writeEnvValue(contents: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, "m");
  return matcher.test(contents) ? contents.replace(matcher, line) : `${contents.trimEnd()}\n${line}\n`;
}

async function main() {
  const stripe = new Stripe(configuredSecretKey);
  const lookupKey = "pokopia_daily_reset_checklist_v1";
  const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
  const price = existing ?? await stripe.prices.create({
    currency: "usd",
    unit_amount: 499,
    lookup_key: lookupKey,
    product_data: { name: "Pokopia Daily Reset Checklist", metadata: { sugarfield_product_id: "P06", funnel: "pokopia_daily_reset" } },
    metadata: { sugarfield_product_id: "P06", funnel: "pokopia_daily_reset" },
  });
  if (price.unit_amount !== 499 || price.currency !== "usd" || !price.active) throw new Error("Live P06 price does not match the approved active $4.99 USD configuration.");

  const webhookUrl = "https://sugarfield-studios.vercel.app/api/stripe/webhook";
  const webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: ["checkout.session.completed"],
    description: "Sugarfield Studio production checkout fulfillment",
  });
  if (!webhook.secret) throw new Error("Stripe did not return a webhook signing secret.");

  const envPath = join(process.cwd(), ".env.local");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  env = writeEnvValue(env, "STRIPE_LIVE_DAILY_RESET_PRICE_ID", price.id);
  env = writeEnvValue(env, "STRIPE_LIVE_WEBHOOK_SECRET", webhook.secret);
  writeFileSync(envPath, env, "utf8");

  console.log(JSON.stringify({ priceId: price.id, lookupKey, amount: price.unit_amount, currency: price.currency, webhookEndpointId: webhook.id, webhookUrl }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Live Stripe setup failed.");
  process.exitCode = 1;
});
