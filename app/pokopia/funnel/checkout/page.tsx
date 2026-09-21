import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PokopiaCheckoutStage } from "@/components/pokopia/PokopiaCheckoutStage";
import { getCanonicalLineItems, hasPaidSelection, isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";
import { getPokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";

export const dynamic = "force-dynamic";
export default async function PokopiaCheckoutPage() {
  if (!isCumulativeCheckoutEnabled()) redirect("/pokopia/funnel/complete");
  const journeyId = (await cookies()).get("sf_pokopia_journey")?.value;
  const journey = journeyId ? await getPokopiaJourney(journeyId) : null;
  if (!journey || !hasPaidSelection(journey) || journey.checkoutCompleted) redirect("/pokopia/funnel/complete");
  return <PokopiaCheckoutStage items={getCanonicalLineItems(journey.selectedProducts)} showFreePack={journey.quickStartClaimed} />;
}
