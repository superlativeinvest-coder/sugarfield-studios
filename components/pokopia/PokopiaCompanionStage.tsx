"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FunnelFrame, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import type { PokopiaFunnelOffer } from "@/data/pokopia-funnel";
import { getCurrentFunnelState } from "@/components/pokopia/PokopiaFunnelStage";
import { STORAGE_KEY } from "@/lib/attribution/capture";
import { createFunnelSession, writeFunnelState } from "@/lib/pokopia-funnel/state";
import { useCumulativeJourney } from "@/components/pokopia/useCumulativeJourney";
import { FunnelCartSummary } from "@/components/pokopia/FunnelCartSummary";

function readStoredAttribution(): { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } | undefined {
  try { const value = window.sessionStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } : undefined; } catch { return undefined; }
}

export function PokopiaCompanionStage({ offer, dailyResetOrderId, cumulativeEnabled = false }: { offer: PokopiaFunnelOffer; dailyResetOrderId: string; cumulativeEnabled?: boolean }) {
  const track = useFunnelTracking();
  const [state, setState] = useState(() => getCurrentFunnelState());
  const cumulative = useCumulativeJourney(cumulativeEnabled);
  useEffect(() => {
    const current = getCurrentFunnelState() ?? createFunnelSession();
    writeFunnelState(window.sessionStorage, current);
    setState(current);
  }, []);
  const checkoutReady = cumulativeEnabled ? cumulative.ready : Boolean(offer.enabled && offer.assetReady && offer.fulfillmentReady && offer.catalogProductId && state);
  async function startCheckout() {
    if (cumulativeEnabled) { const result = await cumulative.act("companion_accepted"); if (result.nextRoute) window.location.assign(result.nextRoute); return; }
    if (!checkoutReady || !state || !offer.catalogProductId) { track("pokopia_companion_unavailable"); return; }
    track("pokopia_companion_checkout_started");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: offer.catalogProductId, offerId: offer.id, sku: offer.productSku ?? offer.catalogProductId, upgrade: false, funnelId: state.funnelId, funnelStep: "companion", funnelSession: state.sessionId, attribution: readStoredAttribution() }) });
    const result = await response.json() as { checkoutUrl?: string };
    if (response.ok && result.checkoutUrl) window.location.assign(result.checkoutUrl);
  }

  async function skip() {
    if (cumulativeEnabled) { const result = await cumulative.act("companion_skipped"); window.location.assign(result.nextRoute ?? "/pokopia/funnel/complete"); return; }
    if (state) { state.companionSkipped = true; writeFunnelState(window.sessionStorage, state); }
    const response = await fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "companion_skipped", ...(dailyResetOrderId ? { sourceOrderId: dailyResetOrderId } : {}) }) });
    const result = await response.json() as { nextRoute?: string };
    const next = result.nextRoute === "/pokopia/funnel/complete-player-system" && dailyResetOrderId
      ? `/pokopia/funnel/complete-player-system?order_id=${encodeURIComponent(dailyResetOrderId)}`
      : result.nextRoute ?? "/pokopia/funnel/complete";
    window.location.assign(next);
  }

  const ownsDailyReset = cumulativeEnabled ? cumulative.journey?.selectedProducts.includes("P06") === true : Boolean(dailyResetOrderId);
  const bridge = ownsDailyReset
    ? "YOUR DAILY ROUTINE IS COVERED. NOW ORGANIZE EVENTS, EXPLORATION, BUILDS, REFERENCES, AND BROADER PROGRESS."
    : "WANT MORE THAN THE FREE STARTER? ORGANIZE EVENTS, EXPLORATION, BUILDS, REFERENCES, AND BROADER PROGRESS IN ONE COMPANION.";
  const deltaCents = 1999;
  return <FunnelFrame step="companion"><section className="companion-hero"><div className="companion-hero__copy"><p className="eyebrow">YOUR NEXT POKOPIA SYSTEM</p><p className="companion-hero__bridge"><span>{bridge}</span></p><h1>POKOPIA<br />ADVENTURE<br />COMPANION</h1><p className="companion-hero__lede">{offer.description}</p>{ownsDailyReset && <div className="companion-hero__owned"><span>ALREADY SELECTED</span><strong>✓ Daily Reset Checklist</strong></div>}<section className="companion-offer" aria-labelledby="companion-offer-title"><p className="eyebrow">EXPAND YOUR SYSTEM</p><h2 id="companion-offer-title">{offer.title}</h2><div className="companion-offer__price"><strong>${offer.funnelPrice?.toFixed(2)}</strong><div><span>ONE-TIME PURCHASE</span><span>6-COMPONENT COMPANION · LETTER + A4</span></div></div><ul>{offer.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></section>{cumulativeEnabled && <FunnelCartSummary journey={cumulative.journey} label="Add Adventure Companion" deltaCents={deltaCents} newTotalCents={(cumulative.journey?.currentTotalCents ?? 0) + deltaCents} />}<div className="companion-hero__actions"><button type="button" onClick={startCheckout} disabled={!checkoutReady}>BUY</button><button type="button" className="companion-skip" onClick={skip}>SKIP</button></div></div><div className="companion-proof" aria-label="Five new Adventure Companion printable tools"><p>5 NEW TOOLS · REAL PRINTABLE PAGES</p><div className="companion-proof__pages"><figure className="companion-proof__page companion-proof__page--event"><Image src="/assets/products/pokopia/mini-tool/p13-event-tracker-page-1.png" alt="Pokopia Event Planner printable page" width={1103} height={1426} /></figure><figure className="companion-proof__page companion-proof__page--spawn"><Image src="/assets/products/pokopia/companion/p16-spawn-tracker-1.png" alt="Pokopia Spawn Tracker Dashboard printable page" width={1020} height={1320} /></figure><figure className="companion-proof__page companion-proof__page--cloud"><Image src="/assets/products/pokopia/companion/p16-cloud-islands-planner-01-p14-v2.png" alt="Pokopia Cloud Islands Planner printable page" width={2550} height={3300} priority /></figure><figure className="companion-proof__page companion-proof__page--field"><Image src="/assets/products/pokopia/companion/p16-field-guide-1.png" alt="Pokopia Field Guide printable page" width={1540} height={1190} /></figure><figure className="companion-proof__page companion-proof__page--dashboard"><Image src="/assets/products/pokopia/companion/p16-adventure-dashboard-1.png" alt="Pokopia Adventure Dashboard printable page" width={1190} height={1540} /></figure></div><span>EVENTS · SPAWNS · BUILDS · REFERENCE · PROGRESS</span></div></section><section className="companion-trust" aria-label="Adventure Companion delivery details"><span>Instant digital access</span><span>Print-friendly PDFs</span><span>Secure checkout with Stripe</span></section></FunnelFrame>;
}
