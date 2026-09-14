import type { PokopiaTier } from "@/lib/pokopia-funnel/cumulative";

export type PokopiaJourney = {
  journeyId: string; funnelSessionId?: string; customerId?: string; quickStartClaimed: boolean;
  dailyResetViewed: boolean; dailyResetPurchased: boolean; dailyResetSkipped: boolean;
  companionViewed: boolean; companionPurchased: boolean; companionSkipped: boolean;
  p18Eligible: boolean; p18Bypassed: boolean; p18Viewed: boolean; p18Purchased: boolean; p18Skipped: boolean;
  p17DownsellViewed: boolean; p17Purchased: boolean; p17Skipped: boolean;
  dailyResetAccepted: boolean; companionAccepted: boolean; p18Accepted: boolean; p17Accepted: boolean;
  selectedTier: PokopiaTier; currentTotalCents: number; preP17Tier?: "P06" | "P16";
  currentStep?: string; checkoutCreated: boolean; checkoutCompleted: boolean;
  stripeCheckoutSessionId?: string; checkoutTier?: PokopiaTier; checkoutPriceId?: string; checkoutAmountCents?: number;
  journeyCompleted: boolean; branchReason?: "double_skip_low_intent" | "P18_PURCHASE_TERMINAL_TEMPORARY";
  firstTouchAttribution?: Record<string, string>; currentAttribution?: Record<string, string>;
  createdAt?: string; updatedAt?: string; completedAt?: string;
};

export const emptyPokopiaJourney = (journeyId = ""): PokopiaJourney => ({ journeyId, quickStartClaimed: false, dailyResetViewed: false, dailyResetPurchased: false, dailyResetSkipped: false, companionViewed: false, companionPurchased: false, companionSkipped: false, p18Eligible: false, p18Bypassed: false, p18Viewed: false, p18Purchased: false, p18Skipped: false, p17DownsellViewed: false, p17Purchased: false, p17Skipped: false, dailyResetAccepted: false, companionAccepted: false, p18Accepted: false, p17Accepted: false, selectedTier: "FREE", currentTotalCents: 0, checkoutCreated: false, checkoutCompleted: false, journeyCompleted: false });

export type PokopiaNextRoute = "/pokopia/funnel/complete-player-system" | "/pokopia/funnel/complete" | "/pokopia/funnel/completionist-kit";

export function resolvePostCompanionRoute(journey: PokopiaJourney): PokopiaNextRoute {
  if (journey.dailyResetPurchased || journey.companionPurchased) return "/pokopia/funnel/complete-player-system";
  if (journey.dailyResetSkipped && journey.companionSkipped) return "/pokopia/funnel/complete";
  return "/pokopia/funnel/complete";
}

export function applyPostCompanionIntent(journey: PokopiaJourney): PokopiaJourney {
  if (journey.dailyResetPurchased || journey.companionPurchased) return { ...journey, p18Eligible: true, p18Bypassed: false };
  if (journey.dailyResetSkipped && journey.companionSkipped) return { ...journey, p18Eligible: false, p18Bypassed: true, branchReason: "double_skip_low_intent", journeyCompleted: true, completedAt: journey.completedAt ?? new Date().toISOString() };
  return journey;
}

export function canViewP17Downsell(journey: PokopiaJourney): boolean { return journey.p18Eligible && journey.p18Viewed && journey.p18Skipped && !journey.p18Bypassed; }

export function canActOnP17Downsell(journey: PokopiaJourney): boolean {
  return journey.currentStep === "completionist-kit" && canViewP17Downsell(journey) && (journey.selectedTier === "P06" || journey.selectedTier === "P16");
}
