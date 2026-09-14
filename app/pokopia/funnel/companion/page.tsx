import type { Metadata } from "next";
import { PokopiaCompanionStage } from "@/components/pokopia/PokopiaCompanionStage";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { isVerifiedDailyResetBuyer } from "@/lib/orders/qualification";
import { getOrderRepository } from "@/lib/orders/repository";
import { isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";

export const metadata: Metadata = { title: "Pokopia Adventure Companion | Sugarfield Studio", description: "A Pokopia planning and reference companion, available after either Daily Reset decision." };
export const dynamic = "force-dynamic";

export default async function PokopiaCompanionPage({ searchParams }: { searchParams: Promise<{ order_id?: string; funnel_session?: string }> }) {
  const params = await searchParams;
  const repository = getOrderRepository();
  const order = repository ? params.order_id ? await repository.findById(params.order_id) : params.funnel_session ? await repository.findByFunnelSession(params.funnel_session) : null : null;
  const dailyResetOrderId = isVerifiedDailyResetBuyer(order) ? order?.id ?? "" : "";
  return <PokopiaCompanionStage offer={pokopiaFunnelOffers.companion} dailyResetOrderId={dailyResetOrderId} cumulativeEnabled={isCumulativeCheckoutEnabled()} />;
}
