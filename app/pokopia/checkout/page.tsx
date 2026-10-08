import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PokopiaCheckoutStage } from "@/components/pokopia/PokopiaCheckoutStage";
import { getCanonicalLineItems, hasPaidSelection, isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";
import { getPokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pokopia Checkout | Sugarfield Studio", alternates: { canonical: "/pokopia/checkout" } };
export default async function PokopiaCheckoutPage() {
  if (!isCumulativeCheckoutEnabled()) redirect("/pokopia/recover?reason=checkout-unavailable");
  const journeyId = (await cookies()).get("sf_pokopia_journey")?.value;
  const journey = journeyId ? await getPokopiaJourney(journeyId) : null;
  if (!journey || !hasPaidSelection(journey) || journey.checkoutCompleted) redirect("/pokopia/recover?reason=checkout-unavailable");
  return <PokopiaCheckoutStage items={getCanonicalLineItems(journey.selectedProducts)} showFreePack={journey.quickStartClaimed} />;
}
