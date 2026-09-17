import type { PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { isVerifiedDailyResetBuyer } from "@/lib/orders/qualification";
import type { OrderRepository } from "@/lib/orders/types";

export function isDoubleSkip(journey: PokopiaJourney): boolean {
  return journey.dailyResetSkipped && journey.companionSkipped;
}

// The browser cookie supplies only a journey identifier. Eligibility comes from
// the server-loaded journey state, never from client-submitted cart data.
export function hasCurrentJourneyP18Eligibility(journey: PokopiaJourney): boolean {
  if (isDoubleSkip(journey) || journey.p18Bypassed || journey.journeyCompleted) return false;
  return (journey.selectedTier === "P06" && journey.dailyResetAccepted)
    || (journey.selectedTier === "P16" && journey.companionAccepted);
}

export async function hasVerifiedHistoricalP06Ownership(repository: OrderRepository | null, customerId: string | undefined): Promise<boolean> {
  if (!repository || !customerId) return false;
  return isVerifiedDailyResetBuyer(await repository.findLatestPaidByCustomerAndProduct(customerId, "P06"));
}

export async function resolveP18Eligibility(journey: PokopiaJourney, repository: OrderRepository | null, customerId?: string): Promise<boolean> {
  if (isDoubleSkip(journey)) return false;
  return hasCurrentJourneyP18Eligibility(journey) || hasVerifiedHistoricalP06Ownership(repository, customerId);
}
