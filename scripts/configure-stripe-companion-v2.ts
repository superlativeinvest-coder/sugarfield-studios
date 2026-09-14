import Stripe from "stripe";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

loadEnvConfig(process.cwd());
const secretKey = process.env.STRIPE_SECRET_KEY;
const legacyPriceId = process.env.STRIPE_COMPANION_PRICE_ID;
if (!secretKey || !secretKey.startsWith("sk_test_")) throw new Error("This cutover script requires a Stripe test secret key.");
if (!legacyPriceId) throw new Error("STRIPE_COMPANION_PRICE_ID must identify the legacy P16 price before creating the v2 price.");
const configuredSecretKey = secretKey as string;
const configuredLegacyPriceId = legacyPriceId as string;

async function main() {
  const stripe = new Stripe(configuredSecretKey);
  const legacy = await stripe.prices.retrieve(configuredLegacyPriceId);
  if (legacy.unit_amount !== 799 || legacy.currency !== "usd") throw new Error("The configured legacy P16 price is not the expected $7.99 USD price.");
  if (typeof legacy.product !== "string") throw new Error("The legacy P16 price is not attached to a concrete Stripe Product.");
  const lookupKey = "pokopia_companion_v2";
  const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
  const price = existing ?? await stripe.prices.create({ product: legacy.product, currency: "usd", unit_amount: 1999, lookup_key: lookupKey, metadata: { sugarfield_product_id: "P16", sku: "pokopia_adventure_companion", fulfillment_version: "P16_V2_19_99", legacy_price_id: legacy.id } });
  if (price.unit_amount !== 1999 || price.currency !== "usd" || price.product !== legacy.product) throw new Error("The P16 v2 Stripe Price does not match the approved target.");
  const envPath = join(process.cwd(), ".env.local");
  const existingEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `STRIPE_ADVENTURE_COMPANION_PRICE_ID=${price.id}`;
  const updatedEnv = /^STRIPE_ADVENTURE_COMPANION_PRICE_ID=.*$/m.test(existingEnv) ? existingEnv.replace(/^STRIPE_ADVENTURE_COMPANION_PRICE_ID=.*$/m, line) : `${existingEnv.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, updatedEnv, "utf8");
  console.log(JSON.stringify({ productId: legacy.product, legacyPriceId: legacy.id, newPriceId: price.id, amount: price.unit_amount, currency: price.currency, active: price.active, created: price.created, lookupKey }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Stripe P16 v2 setup failed."); process.exitCode = 1; });
