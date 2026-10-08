import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { getCanonicalP18StripePriceId, getDailyResetStripePriceId, getQuickStartStripePriceId } from "@/lib/stripe/configuration";
import { getProductFilePaths } from "@/lib/delivery/service";
import { validateP18StagedPackage } from "@/lib/delivery/p18-staged";
import { validateP16V3Package } from "@/lib/delivery/p16-v3-staged";
import { getActiveFulfillmentVersions } from "@/lib/delivery/fulfillment-environment";

export const POKOPIA_CUMULATIVE_CHECKOUT_FLAG = "POKOPIA_CUMULATIVE_CHECKOUT_ENABLED";
export const CANONICAL_SELECTION_ORDER = ["P06", "P16", "P18", "P17"] as const;
export const CHECKOUT_SCHEMA_VERSION = "pokopia-accumulated-order-v2";
export const CANONICAL_PRICE_VERSION = "pokopia-approved-launch-prices-v1";
export type PokopiaSelectedProduct = (typeof CANONICAL_SELECTION_ORDER)[number];

export type CanonicalLineItem = { productId: PokopiaSelectedProduct; sku: string; title: string; unitAmount: number; currency: "usd"; stripePriceId?: string };
export type CheckoutFreeLineItem = { productId: "FREE-QUICK-START"; sku: "FREE-QUICK-START"; title: "Free Quick Start Pack"; unitAmount: 0; currency: "usd"; stripePriceId?: string };

const products: Record<PokopiaSelectedProduct, CanonicalLineItem> = {
  P06: { productId: "P06", sku: "P06", title: "P06 Daily Reset", unitAmount: 499, currency: "usd", stripePriceId: getDailyResetStripePriceId() },
  P16: { productId: "P16", sku: "pokopia_adventure_companion", title: "P16 Adventure Companion", unitAmount: 1999, currency: "usd", stripePriceId: process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID },
  P18: { productId: "P18", sku: "pokopia_complete_player_system", title: "P18 Complete Player System", unitAmount: 2499, currency: "usd", stripePriceId: getCanonicalP18StripePriceId() },
  P17: { productId: "P17", sku: "P17", title: "P17 Completionist Kit", unitAmount: 1499, currency: "usd", stripePriceId: process.env.STRIPE_P17_STANDALONE_PRICE_ID },
};

export function isCumulativeCheckoutEnabledForEnvironment(environment: Record<string, string | undefined>): boolean {
  return environment[POKOPIA_CUMULATIVE_CHECKOUT_FLAG] === "true" && getActiveFulfillmentVersions(environment) !== null;
}
export function isCumulativeCheckoutEnabled(): boolean { return isCumulativeCheckoutEnabledForEnvironment(process.env); }
export function isSelectedProduct(value: unknown): value is PokopiaSelectedProduct { return typeof value === "string" && (CANONICAL_SELECTION_ORDER as readonly string[]).includes(value); }
export function normalizeSelectedProducts(value: readonly unknown[] | undefined): PokopiaSelectedProduct[] { const values = new Set((value ?? []).filter(isSelectedProduct)); return CANONICAL_SELECTION_ORDER.filter((productId) => values.has(productId)); }
export function getCanonicalLineItem(productId: PokopiaSelectedProduct): CanonicalLineItem { return products[productId]; }
export function getCanonicalLineItems(productIds: readonly unknown[]): CanonicalLineItem[] { return normalizeSelectedProducts(productIds).map(getCanonicalLineItem); }
export function getCheckoutDisplayLineItems(productIds: readonly unknown[], includeFreePack: boolean): Array<CanonicalLineItem | CheckoutFreeLineItem> { return [ ...(includeFreePack ? [{ productId: "FREE-QUICK-START", sku: "FREE-QUICK-START", title: "Free Quick Start Pack", unitAmount: 0, currency: "usd", stripePriceId: getQuickStartStripePriceId() } as CheckoutFreeLineItem] : []), ...getCanonicalLineItems(productIds) ]; }
export function getSelectedTotalCents(productIds: readonly unknown[]): number { return getCanonicalLineItems(productIds).reduce((total, item) => total + item.unitAmount, 0); }
export function hasPaidSelection(journey: PokopiaJourney): boolean { return normalizeSelectedProducts(journey.selectedProducts).length > 0; }
export function clearCheckout(journey: PokopiaJourney): PokopiaJourney { return { ...journey, checkoutCreated: false, checkoutCompleted: false, stripeCheckoutSessionId: undefined, checkoutTier: undefined, checkoutPriceId: undefined, checkoutAmountCents: undefined, checkoutFingerprint: undefined, checkoutFingerprintVersion: undefined }; }
export function addProductSelection(journey: PokopiaJourney, productId: PokopiaSelectedProduct): PokopiaJourney { const selectedProducts = normalizeSelectedProducts([...journey.selectedProducts, productId]); return clearCheckout({ ...journey, selectedProducts, currentTotalCents: getSelectedTotalCents(selectedProducts), journeyCompleted: false, completedAt: undefined }); }
export function createCheckoutFingerprint(journeyId: string, productIds: readonly unknown[]): string { return createHash("sha256").update([journeyId, normalizeSelectedProducts(productIds).join(","), "usd", CANONICAL_PRICE_VERSION, CHECKOUT_SCHEMA_VERSION].join("|"), "utf8").digest("hex"); }
export function checkoutFingerprintMatches(journey: PokopiaJourney): boolean { const selectedProducts = normalizeSelectedProducts(journey.selectedProducts); return Boolean(selectedProducts.length && journey.checkoutFingerprint === createCheckoutFingerprint(journey.journeyId, selectedProducts) && journey.checkoutFingerprintVersion === CHECKOUT_SCHEMA_VERSION && journey.checkoutAmountCents === getSelectedTotalCents(selectedProducts)); }
export function stripeSessionMatchesFingerprint(session: Stripe.Checkout.Session, journey: PokopiaJourney): boolean { const selectedProducts = normalizeSelectedProducts(journey.selectedProducts); const expected = getCheckoutDisplayLineItems(selectedProducts, journey.quickStartClaimed); const actual = session.line_items?.data ?? []; return checkoutFingerprintMatches(journey) && session.status === "open" && session.currency === "usd" && session.metadata?.journey_id === journey.journeyId && session.metadata?.checkout_fingerprint === journey.checkoutFingerprint && session.metadata?.checkout_schema_version === CHECKOUT_SCHEMA_VERSION && session.metadata?.selected_product_ids === selectedProducts.join(",") && session.metadata?.canonical_total_cents === String(getSelectedTotalCents(selectedProducts)) && session.metadata?.free_pack_claimed === String(journey.quickStartClaimed) && actual.length === expected.length && expected.every((item) => actual.some((actualItem) => { const price = typeof actualItem.price === "string" ? undefined : actualItem.price; return item.productId === "FREE-QUICK-START" ? Boolean(price && actualItem.quantity === 1 && price.unit_amount === 0 && price.currency === "usd" && (!item.stripePriceId || price.id === item.stripePriceId)) : Boolean(price && actualItem.quantity === 1 && price.id === item.stripePriceId && price.unit_amount === item.unitAmount && price.currency === "usd"); })); }
function storageMarkerFor(productId: "P16" | "P18", environment: "STAGING" | "PRODUCTION"): string | undefined {
  return process.env[`${productId}_${environment === "PRODUCTION" ? "PRODUCTION" : "STAGED"}_STORAGE_VERIFIED_VERSION`];
}

export function getP16Readiness(): { ready: boolean; reason?: string } {
  const versions = getActiveFulfillmentVersions(process.env);
  if (!versions) return { ready: false, reason: "P16 checkout requires an approved Supabase and Stripe environment pair." };
  if (!products.P16.stripePriceId) return { ready: false, reason: "The canonical P16 Stripe Price ID is not configured." };
  if (validateP16V3Package().length > 0) return { ready: false, reason: "The approved P16 V3 delivery manifest is invalid." };
  const files = getProductFilePaths("P16", versions.p16);
  if (files.length !== 12 || files.some((path) => !path.endsWith(".pdf"))) return { ready: false, reason: "The approved P16 production delivery map is incomplete." };
  if (storageMarkerFor("P16", versions.environment) !== versions.p16) return { ready: false, reason: "P16 private storage verification has not been approved for this package version." };
  return { ready: true };
}

export function getP18ReadinessStatus() {
  const versions = getActiveFulfillmentVersions(process.env);
  const manifestReady = validateP18StagedPackage().length === 0;
  const checkoutActivated = process.env.P18_CHECKOUT_ACTIVATION_ENABLED === "true";
  const version = versions?.p18;
  const storageReady = Boolean(versions && version && storageMarkerFor("P18", versions.environment) === version);
  return {
    manifest: { ready: manifestReady },
    localIntegrity: { ready: manifestReady },
    stripePrice: { ready: Boolean(products.P18.stripePriceId) },
    fulfillmentMapping: { ready: Boolean(version && getProductFilePaths("P18", version).length === 22), version },
    storageObjects: { ready: storageReady, reason: "Requires the reviewed environment-specific storage verification marker." },
    signedUrls: { ready: storageReady, reason: "Requires the reviewed environment-specific storage verification marker." },
    checkoutActivation: { enabled: checkoutActivated, reason: checkoutActivated ? undefined : "P18 checkout requires separate activation approval." },
    customerEntitlementActivation: { enabled: checkoutActivated, reason: checkoutActivated ? undefined : "P18 delivery requires the same separate activation approval as checkout." },
  };
}

export function getP18Readiness(): { ready: boolean; reason?: string } {
  if (process.env.P18_CHECKOUT_ACTIVATION_ENABLED !== "true") return { ready: false, reason: "P18 checkout requires separate activation approval." };
  const versions = getActiveFulfillmentVersions(process.env);
  if (!versions) return { ready: false, reason: "P18 checkout requires an approved Supabase and Stripe environment pair." };
  if (!products.P18.stripePriceId) return { ready: false, reason: "The canonical P18 $24.99 Stripe Price ID is not configured." };
  if (validateP18StagedPackage().length > 0) return { ready: false, reason: "The approved P18 delivery manifest is invalid." };
  const files = getProductFilePaths("P18", versions.p18);
  if (files.length !== 22 || files.some((path) => !path.endsWith(".pdf"))) return { ready: false, reason: "The approved P18 delivery map is incomplete." };
  if (storageMarkerFor("P18", versions.environment) !== versions.p18) return { ready: false, reason: "P18 private storage verification has not been approved for this package version." };
  return { ready: true };
}
export function getP17Readiness(): { ready: boolean; reason?: string } {
  if (!products.P17.stripePriceId) return { ready: false, reason: "The Completionist Kit staging Stripe Price ID is not configured." };
  const files = getProductFilePaths("P17");
  if (!files.length || files.some((path) => !path.endsWith(".pdf") && !path.endsWith(".md"))) return { ready: false, reason: "The Completionist Kit fulfillment package is not configured." };
  return { ready: true };
}
