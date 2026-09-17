import type { PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import type Stripe from "stripe";
import { getCanonicalP18StripePriceId, getDailyResetStripePriceId } from "@/lib/stripe/configuration";
import { getProductFilePaths } from "@/lib/delivery/service";
import { p18StagedManifest, validateP18StagedPackage } from "@/lib/delivery/p18-staged";
import { classifySupabaseTarget } from "@/lib/supabase/environment";

export const POKOPIA_CUMULATIVE_CHECKOUT_FLAG = "POKOPIA_CUMULATIVE_CHECKOUT_ENABLED";
export type PokopiaTier = "FREE" | "P06" | "P16" | "P18" | "P17";
export type PaidPokopiaTier = Exclude<PokopiaTier, "FREE">;

type TierDefinition = {
  productId: PokopiaTier;
  title: string;
  totalCents: number;
  stripePriceId?: string;
  includes?: string[];
};

const tiers: Record<PokopiaTier, TierDefinition> = {
  FREE: { productId: "FREE", title: "Quick Start", totalCents: 0 },
  P06: { productId: "P06", title: "Daily Reset", totalCents: 499, stripePriceId: getDailyResetStripePriceId(), includes: ["Daily Reset"] },
  P16: { productId: "P16", title: "Adventure Companion", totalCents: 1999, stripePriceId: process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID, includes: ["Daily Reset", "Adventure Companion tools"] },
  P18: { productId: "P18", title: "Complete Player System", totalCents: 2499, stripePriceId: getCanonicalP18StripePriceId(), includes: ["Daily Reset", "Adventure Companion tools", "Complete Player System exclusives"] },
  P17: { productId: "P17", title: "Completionist Kit", totalCents: 1499, stripePriceId: process.env.STRIPE_P17_STANDALONE_PRICE_ID, includes: ["Field Guide", "26-card Reference Collection"] },
};

export function isCumulativeCheckoutEnabledForEnvironment(environment: Record<string, string | undefined>): boolean {
  // This flow is intentionally impossible to activate against production, even
  // if a deployment environment accidentally receives the feature flag.
  return environment[POKOPIA_CUMULATIVE_CHECKOUT_FLAG] === "true"
    && classifySupabaseTarget(environment.SUPABASE_URL) === "STAGING"
    && environment.STRIPE_SECRET_KEY?.startsWith("sk_test_") === true;
}
export function isCumulativeCheckoutEnabled(): boolean { return isCumulativeCheckoutEnabledForEnvironment(process.env); }
export function getTier(tier: PokopiaTier): TierDefinition { return tiers[tier]; }
export function formatCents(cents: number): string { return `$${(cents / 100).toFixed(2)}`; }
export function getP18ReadinessStatus() {
  const manifestErrors = validateP18StagedPackage();
  return {
    manifest: { ready: manifestErrors.length === 0 },
    localIntegrity: { ready: manifestErrors.length === 0 },
    stripePrice: { ready: Boolean(tiers.P18.stripePriceId) },
    fulfillmentMapping: { ready: manifestErrors.length === 0 && p18StagedManifest.deliveryMapStatus === "staged-not-active", version: "P18_V1_24_99_STAGED" },
    storageObjects: { ready: process.env.P18_STAGED_STORAGE_VERIFIED_VERSION === "P18_V1_24_99_STAGED", reason: "Requires the reviewed staged-storage verification marker." },
    signedUrls: { ready: process.env.P18_STAGED_STORAGE_VERIFIED_VERSION === "P18_V1_24_99_STAGED", reason: "Requires the reviewed staged-storage verification marker." },
    checkoutActivation: { enabled: false, reason: "P18 remains staged until private storage verification and a separate activation approval." },
    customerEntitlementActivation: { enabled: false, reason: "The P18 staged resolver is not connected to the active entitlement delivery provider." },
  };
}
export function getP18Readiness(): { ready: boolean; reason?: string } {
  if (!tiers.P18.stripePriceId) return { ready: false, reason: "The canonical live P18 $24.99 Stripe Price ID is not configured." };
  if (validateP18StagedPackage().length > 0) return { ready: false, reason: "The approved P18 staged delivery manifest is invalid." };
  const files = getProductFilePaths("P18", "P18_V1_24_99_STAGED");
  if (files.length !== 22 || files.some((path) => !path.endsWith(".pdf"))) return { ready: false, reason: "The approved P18 delivery map is staged only and has not been activated." };
  if (process.env.P18_STAGED_STORAGE_VERIFIED_VERSION !== "P18_V1_24_99_STAGED") return { ready: false, reason: "P18 private storage verification has not been approved for this package version." };
  return { ready: true };
}
export function isTierCheckoutReady(tier: PaidPokopiaTier): boolean { return tier !== "P18" || getP18Readiness().ready; }
export function getUpgradeDeltaCents(from: PokopiaTier, to: PokopiaTier): number { return getTier(to).totalCents - getTier(from).totalCents; }
export function clearCheckout(journey: PokopiaJourney): PokopiaJourney {
  return { ...journey, checkoutCreated: false, checkoutCompleted: false, stripeCheckoutSessionId: undefined, checkoutTier: undefined, checkoutPriceId: undefined, checkoutAmountCents: undefined };
}
export function selectTier(journey: PokopiaJourney, tier: PaidPokopiaTier): PokopiaJourney {
  const definition = getTier(tier);
  return clearCheckout({ ...journey, selectedTier: tier, currentTotalCents: definition.totalCents, journeyCompleted: false, completedAt: undefined });
}
export function restorePriorTier(journey: PokopiaJourney): PokopiaJourney {
  const tier = journey.preP17Tier;
  return tier === "P06" || tier === "P16" ? selectTier({ ...journey, preP17Tier: undefined }, tier) : journey;
}
export function checkoutFingerprintMatches(journey: PokopiaJourney, tier: PaidPokopiaTier): boolean {
  const definition = getTier(tier);
  return Boolean(!journey.checkoutCompleted && journey.stripeCheckoutSessionId && journey.checkoutTier === tier && journey.checkoutPriceId === definition.stripePriceId && journey.checkoutAmountCents === definition.totalCents);
}

export function stripeSessionMatchesFingerprint(session: Stripe.Checkout.Session, journey: PokopiaJourney, tier: PaidPokopiaTier): boolean {
  const definition = getTier(tier);
  const lineItems = session.line_items?.data;
  const item = lineItems?.[0];
  const price = typeof item?.price === "string" ? undefined : item?.price;
  return checkoutFingerprintMatches(journey, tier)
    && session.status === "open"
    && session.metadata?.journey_id === journey.journeyId
    && session.metadata?.selected_tier === tier
    && session.metadata?.stripe_price_id === definition.stripePriceId
    && session.metadata?.canonical_total_cents === String(definition.totalCents)
    && session.metadata?.funnel_session_id === (journey.funnelSessionId ?? "")
    && session.currency === "usd"
    && lineItems?.length === 1
    && item?.quantity === 1
    && price?.id === definition.stripePriceId
    && price.unit_amount === definition.totalCents
    && price.currency === "usd";
}
