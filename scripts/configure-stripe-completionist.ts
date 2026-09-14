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
  const products = await stripe.products.search({ query: "metadata['sugarfield_product_id']:'P17'", limit: 1 });
  const product = products.data[0] ?? await stripe.products.create({ name: "Pokopia Completionist Kit", metadata: { sugarfield_product_id: "P17", sku: "P17", offer_id: "pokopia_completionist_kit" } });
  const standalone = (await stripe.prices.list({ lookup_keys: ["pokopia_completionist_kit_v1"], active: true, limit: 1 })).data[0] ?? await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: 1499, lookup_key: "pokopia_completionist_kit_v1", metadata: { sugarfield_product_id: "P17", sku: "P17", offer_id: "pokopia_completionist_kit", price_context: "standalone" } });
  const upgrade = (await stripe.prices.list({ lookup_keys: ["pokopia_completionist_kit_upgrade_v1"], active: true, limit: 1 })).data[0] ?? await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: 999, lookup_key: "pokopia_completionist_kit_upgrade_v1", metadata: { sugarfield_product_id: "P17", sku: "P17", offer_id: "pokopia_completionist_kit", price_context: "p16_upgrade" } });
  const envPath = join(process.cwd(), ".env.local");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const [key, value] of [["STRIPE_P17_STANDALONE_PRICE_ID", standalone.id], ["STRIPE_P17_UPGRADE_PRICE_ID", upgrade.id], ["STRIPE_P17_STRIPE_PRODUCT_ID", product.id]] as const) {
    const line = `${key}=${value}`;
    env = new RegExp(`^${key}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${env.trimEnd()}\n${line}\n`;
  }
  writeFileSync(envPath, env, "utf8");
  console.log(JSON.stringify({ productId: product.id, standalonePriceId: standalone.id, standaloneAmount: standalone.unit_amount, upgradePriceId: upgrade.id, upgradeAmount: upgrade.unit_amount, currency: upgrade.currency }, null, 2));
  console.log("Saved P17 test Product and Price IDs to .env.local.");
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Stripe setup failed."); process.exitCode = 1; });
