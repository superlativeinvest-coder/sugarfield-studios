import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PokopiaCompletePlayerSystemStage } from "@/components/pokopia/PokopiaCompletePlayerSystemStage";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { isVerifiedCompanionBuyer, isVerifiedDailyResetBuyer } from "@/lib/orders/qualification";
import { getOrderRepository } from "@/lib/orders/repository";
import { getP18Readiness, isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";
import { getPokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { cookies } from "next/headers";
import { getCustomerSession } from "@/lib/customer/session";
import { resolveP18Eligibility } from "@/lib/pokopia-funnel/eligibility";

export const metadata: Metadata = { title: "Pokopia Complete Player System | Sugarfield Studio", description: "A qualified upsell for verified Pokopia system buyers." };
export const dynamic = "force-dynamic";

export default async function CompletePlayerSystemPage({ searchParams }: { searchParams: Promise<{ order_id?: string; preview?: string }> }) {
  const { order_id: orderId, preview } = await searchParams;
  const localPreview = process.env.NODE_ENV !== "production" && preview === "1";
  const repository = getOrderRepository();
  const order = repository && orderId ? await repository.findById(orderId) : null;
  const cumulativeEnabled = isCumulativeCheckoutEnabled();
  const journeyId = (await cookies()).get("sf_pokopia_journey")?.value;
  const journey = cumulativeEnabled && journeyId ? await getPokopiaJourney(journeyId) : null;
  const customer = await getCustomerSession();
  const cumulativeEligible = journey ? await resolveP18Eligibility(journey, getOrderRepository(), customer?.customer.id) : false;
  if (!localPreview && (cumulativeEnabled ? !journey || !cumulativeEligible : !order || (!isVerifiedDailyResetBuyer(order) && !isVerifiedCompanionBuyer(order)))) redirect("/pokopia/funnel/complete");
  return <PokopiaCompletePlayerSystemStage offer={pokopiaFunnelOffers.completePlayerSystem} sourceOrderId={localPreview ? "local-preview" : order?.id ?? ""} sourceProductId={localPreview || order?.productId === "P16" ? "P16" : "P06"} cumulativeEnabled={cumulativeEnabled} p18Ready={getP18Readiness().ready} />;
}
