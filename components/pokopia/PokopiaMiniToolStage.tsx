"use client";

import Link from "next/link";
import Image from "next/image";
import { FunnelFrame, getCurrentFunnelState, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import type { PokopiaFunnelOffer } from "@/data/pokopia-funnel";
import { STORAGE_KEY } from "@/lib/attribution/capture";

function readStoredAttribution(): { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } | undefined {
  try { const value = window.sessionStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } : undefined; } catch { return undefined; }
}

export function PokopiaMiniToolStage({ offer, qualified, orderId }: { offer: PokopiaFunnelOffer; qualified: boolean; orderId: string }) {
  const track = useFunnelTracking();
  const state = getCurrentFunnelState();
  const checkoutReady = Boolean(qualified && offer.enabled && offer.assetReady && offer.fulfillmentReady && offer.catalogProductId && state);

  async function startCheckout() {
    if (!checkoutReady || !state || !offer.catalogProductId) { track("pokopia_mini_tool_unavailable"); return; }
    track("pokopia_mini_tool_checkout_started");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: offer.catalogProductId, offerId: offer.id, sku: offer.productSku ?? offer.catalogProductId, upgrade: true, funnelId: state.funnelId, funnelStep: "mini_tool", funnelSession: state.sessionId, attribution: readStoredAttribution(), sourceOrderId: orderId }) });
    const result = await response.json() as { checkoutUrl?: string };
    if (response.ok && result.checkoutUrl) window.location.assign(result.checkoutUrl);
  }

  return <FunnelFrame step="mini-tool"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">A focused next step</p><h1>MAKE YOUR NEXT POKOPIA SESSION EASIER.</h1><p className="focused-funnel__lede">You’ve already built a daily reset habit. The Event Tracker keeps limited-time goals, materials, rewards, and countdown notes in one reusable system.</p>{qualified ? <div className="focused-funnel__offer-heading"><p className="eyebrow">Qualified buyer offer</p><h2>{offer.title}</h2>{offer.funnelPrice !== undefined && <strong>${offer.funnelPrice.toFixed(2)}</strong>}</div> : <div className="focused-funnel__status" role="status"><strong>This offer is for verified Daily Reset buyers.</strong><br />Return through your completed Daily Reset order to continue.</div>}<ul className="focused-funnel__benefits">{offer.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul><div className="focused-funnel__actions"><button className="action-link action-link--primary" type="button" onClick={startCheckout} disabled={!checkoutReady}>{checkoutReady ? offer.cta : "EVENT TRACKER UNAVAILABLE"}</button><Link className="focused-funnel__quiet-link" href="/pokopia/funnel/daily-reset">Back to Daily Reset</Link></div>{qualified && !checkoutReady && <p className="focused-funnel__status">Checkout is unavailable until the Stripe test Price ID is configured.</p>}</div><div className="focused-funnel__visual" aria-label="Pokopia Event Tracker product preview"><span className="focused-funnel__visual-label">EVENT TRACKER</span><div className="focused-funnel__art-frame"><Image src={offer.image ?? "/assets/site/category-images/pokopia.webp"} alt="Pokopia Event Tracker page 1" width={800} height={1100} /></div></div></section><p className="focused-funnel__trust">Your qualification is checked against the verified Supabase order, not browser state.</p></FunnelFrame>;
}
