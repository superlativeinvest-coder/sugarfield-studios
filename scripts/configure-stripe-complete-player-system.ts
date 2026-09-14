import Stripe from "stripe";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

loadEnvConfig(process.cwd());

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is empty. Add a Stripe test key to .env.local, then run this command again.");
}
if (!secretKey.startsWith("sk_test_")) {
  throw new Error("This setup script only accepts a Stripe test secret key (sk_test_...).");
}

const stripeSecretKey = secretKey;
const LOOKUP_KEY = "pokopia_complete_player_system_launch_v1";
const EXPECTED_AMOUNT = 2499;

function upsertEnvValue(env: string, key: string, value: string) {
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, "m");
  return matcher.test(env)
    ? env.replace(matcher, line)
    : `${env.trimEnd()}\n${line}\n`;
}

async function main() {
  const stripe = new Stripe(stripeSecretKey);
  const products = await stripe.products.search({
    query: "metadata['sugarfield_product_id']:'P18'",
    limit: 1,
  });
  const product = products.data[0] ?? await stripe.products.create({
    name: "Pokopia Complete Player System",
    metadata: {
      sugarfield_product_id: "P18",
      sku: "pokopia_complete_player_system",
      offer_id: "pokopia_complete_player_system",
      checkout_mode: "cumulative_final_tier",
    },
  });

  const price = (await stripe.prices.list({
    lookup_keys: [LOOKUP_KEY],
    active: true,
    limit: 1,
  })).data[0] ?? await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: EXPECTED_AMOUNT,
    lookup_key: LOOKUP_KEY,
    metadata: {
      sugarfield_product_id: "P18",
      sku: "pokopia_complete_player_system",
      offer_id: "pokopia_complete_player_system",
      price_context: "launch_total_tier",
    },
  });

  if (price.product !== product.id || price.currency !== "usd" || price.unit_amount !== EXPECTED_AMOUNT || !price.active) {
    throw new Error(`Existing ${LOOKUP_KEY} Price does not match the approved active USD $24.99 P18 configuration.`);
  }

  const envPath = join(process.cwd(), ".env.local");
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  writeFileSync(envPath, upsertEnvValue(env, "STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID", price.id), "utf8");

  console.log(JSON.stringify({
    productId: product.id,
    priceId: price.id,
    amount: price.unit_amount,
    currency: price.currency,
    mode: "test",
  }, null, 2));
  console.log("Saved the P18 test Price ID to .env.local. P18 activation and fulfillment readiness remain unchanged.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Stripe setup failed.");
  process.exitCode = 1;
});
