import type { PokopiaSelectedProduct } from "@/lib/pokopia-funnel/cumulative";

export type PokopiaJourney = {
  journeyId: string; funnelSessionId?: string; customerId?: string; quickStartClaimed: boolean;
  dailyResetViewed: boolean; dailyResetPurchased: boolean; dailyResetSkipped: boolean;
  companionViewed: boolean; companionPurchased: boolean; companionSkipped: boolean;
  p18Eligible: boolean; p18QualifiedView: boolean; p18Bypassed: boolean; p18Viewed: boolean; p18Purchased: boolean; p18Skipped: boolean;
  p17Eligible: boolean; p17DownsellViewed: boolean; p17Purchased: boolean; p17Skipped: boolean;
  dailyResetAccepted: boolean; companionAccepted: boolean; p18Accepted: boolean; p17Accepted: boolean;
  selectedProducts: readonly PokopiaSelectedProduct[]; currentTotalCents: number;
  selectedTier: "FREE" | "P06" | "P16" | "P18" | "P17"; preP17Tier?: "P06" | "P16";
  currentStep?: string; journeyVersion: number; checkoutCreated: boolean; checkoutCompleted: boolean;
  stripeCheckoutSessionId?: string; checkoutTier?: "FREE" | "P06" | "P16" | "P18" | "P17"; checkoutPriceId?: string; checkoutAmountCents?: number;
  checkoutFingerprint?: string; checkoutFingerprintVersion?: string;
  journeyCompleted: boolean; branchReason?: "double_skip_low_intent" | "P18_PURCHASE_TERMINAL_TEMPORARY";
  firstTouchAttribution?: Record<string, string>; currentAttribution?: Record<string, string>; createdAt?: string; updatedAt?: string; completedAt?: string;
};
export const emptyPokopiaJourney = (journeyId = ""): PokopiaJourney => ({ journeyId, quickStartClaimed: false, dailyResetViewed: false, dailyResetPurchased: false, dailyResetSkipped: false, companionViewed: false, companionPurchased: false, companionSkipped: false, p18Eligible: false, p18QualifiedView: false, p18Bypassed: false, p18Viewed: false, p18Purchased: false, p18Skipped: false, p17Eligible: false, p17DownsellViewed: false, p17Purchased: false, p17Skipped: false, dailyResetAccepted: false, companionAccepted: false, p18Accepted: false, p17Accepted: false, selectedProducts: [], currentTotalCents: 0, selectedTier: "FREE", journeyVersion: 0, checkoutCreated: false, checkoutCompleted: false, journeyCompleted: false });
export type PokopiaNextRoute = "/pokopia/funnel/complete-player-system" | "/pokopia/funnel/complete" | "/pokopia/funnel/completionist-kit" | "/pokopia/funnel/checkout" | "/pokopia/funnel/companion" | "/pokopia/funnel/daily-reset";
// A later SKIP never removes an earlier BUY; therefore it cannot convert an
// already accepted offer into the double-skip bypass.
export function isDoubleSkip(journey: PokopiaJourney): boolean { return journey.dailyResetSkipped && !journey.dailyResetAccepted && journey.companionSkipped && !journey.companionAccepted; }
export function canViewP17Downsell(journey: PokopiaJourney): boolean { return journey.p17Eligible && journey.p18QualifiedView && journey.p18Skipped && !journey.p18Bypassed; }
export function canActOnP17Downsell(journey: PokopiaJourney): boolean { return journey.currentStep === "completionist-kit" && canViewP17Downsell(journey); }
