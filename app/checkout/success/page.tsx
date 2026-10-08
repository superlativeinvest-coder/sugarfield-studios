import { VerifiedOrderPanel } from "@/components/checkout/VerifiedOrderPanel";
import { getOrderRepository } from "@/lib/orders/repository";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const repository = getOrderRepository();
  const order = sessionId && repository ? await repository.findByProviderSessionId(sessionId) : null;

  const productHeading = order && new Set(order.entitlements.map((entitlement) => entitlement.productId)).size > 1 ? "Your Pokopia downloads are ready." : order?.productId === "FREE-QUICK-START" ? "Your Pokopia Quick Start Pack is ready." : order?.productId === "P18" ? "Your Pokopia Complete Player System is ready." : order?.productId === "P17" ? "Your Pokopia Completionist Kit is ready." : order?.productId === "P13" ? "Your Pokopia Event Tracker is ready." : order?.productId === "P16" ? "Your Pokopia Adventure Companion is ready." : "Your Pokopia checklist is ready.";
  return <main><section className="site-section checkout-success-section"><div className="site-container"><p className="eyebrow">Checkout complete</p><h1>{order ? productHeading : "We’re confirming your checkout."}</h1><p className="section-intro">{order ? "Your checkout was verified by Stripe and your order is safely stored. Generate a fresh download link for each included product below." : "Stripe sent you back successfully. We’re waiting for the verified webhook before showing any files or entitlements."}</p><VerifiedOrderPanel order={order ? { id: order.id, productId: order.productId, fulfillmentStatus: order.fulfillmentStatus, entitlements: order.entitlements } : null} sessionId={sessionId ?? ""} /></div></section></main>;
}
