import type { CumulativeJourneyView } from "@/components/pokopia/useCumulativeJourney";

export function FunnelCartSummary({ journey, label, deltaCents, newTotalCents }: { journey: CumulativeJourneyView | null; label: string; deltaCents: number; newTotalCents: number }) {
  const current = journey ? `$${(journey.currentTotalCents / 100).toFixed(2)}` : "…";
  return <aside className="focused-funnel__status" aria-label="Your current Pokopia setup"><strong>YOUR SETUP</strong><br />Current total: {current}<br />{label}: +${(deltaCents / 100).toFixed(2)}<br />New total: ${(newTotalCents / 100).toFixed(2)}</aside>;
}
