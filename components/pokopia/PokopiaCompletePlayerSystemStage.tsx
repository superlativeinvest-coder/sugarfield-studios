"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FunnelFrame, getCurrentFunnelState, useCanonicalFunnelTracking, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import type { PokopiaFunnelOffer } from "@/data/pokopia-funnel";
import { readStoredAttribution } from "@/lib/attribution/capture";
import { useCumulativeJourney } from "@/components/pokopia/useCumulativeJourney";
import { FunnelCartSummary } from "@/components/pokopia/FunnelCartSummary";

function readStoredAttributionForCheckout(): { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } | undefined { return readStoredAttribution(window.localStorage, window.sessionStorage) ?? undefined; }

const primaryPreviews = [
  ["hq", "/assets/products/pokopia/complete-player-system/p18-hq-command-center.png", "My Pokopia HQ Command Center printable page", 1103, 1426],
  ["progress", "/assets/products/pokopia/complete-player-system/p18-master-progress-dashboard.png", "Master Progress Dashboard printable page", 2550, 3300],
  ["roadmap", "/assets/products/pokopia/complete-player-system/p18-completion-roadmap.png", "Completion Roadmap printable page", 2550, 3300],
  ["weekly", "/assets/products/pokopia/complete-player-system/p18-weekly-adventure-planner.png", "Weekly Adventure Planner printable page", 2550, 3300],
  ["resources", "/assets/products/pokopia/complete-player-system/p18-resource-inventory-planner.png", "Resource and Inventory Planner printable page", 2550, 3300],
] as const;

const hqPreview = primaryPreviews[0];
const corePreviews = [primaryPreviews[1], primaryPreviews[3], primaryPreviews[4], primaryPreviews[2]] as const;

const supportingPreviews = [
  ["daily", "/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-1.png", "Daily Reset printable page", 800, 1100],
  ["event", "/assets/products/pokopia/mini-tool/p13-event-tracker-page-1.png", "Event Tracker printable page", 800, 1100],
  ["spawn", "/assets/products/pokopia/companion/p16-spawn-tracker-1.png", "Spawn Tracker printable page", 800, 1100],
  ["cloud", "/assets/products/pokopia/companion/p16-cloud-islands-planner-01-p14-v2.png", "Cloud Islands Planner printable page", 800, 1100],
  ["dashboard", "/assets/products/pokopia/companion/p16-adventure-dashboard-1.png", "Adventure Dashboard printable page", 800, 1100],
  ["guide", "/assets/products/pokopia/companion/p16-field-guide-1.png", "Field Guide printable page", 1540, 1190],
] as const;

const leftSupportPreviews = supportingPreviews.slice(0, 3);
const rightSupportPreviews = supportingPreviews.slice(3);

const valuePanels = [
  ["my-pokopia-hq", "My Pokopia HQ", "/assets/products/pokopia/complete-player-system/p18-value-panel-my-pokopia-hq-rebuilt-approved-v2.png", "My Pokopia HQ panel showing the Command Center, Area and Project Memory, and System Navigator pages."],
  ["complete-system", "The Complete System", "/assets/products/pokopia/complete-player-system/p18-value-panel-complete-system-normalized-v4.png", "The Complete System panel listing all 11 connected P18 tools."],
  ["plan-track-complete", "Plan, Track, Complete", "/assets/products/pokopia/complete-player-system/p18-value-panel-plan-track-complete-approved.png", "Plan, Track, Complete panel with four player-management outcomes."],
  ["digital-download-formats", "Digital Download Formats", "/assets/products/pokopia/complete-player-system/p18-value-panel-digital-download-formats-approved.png", "Digital Download Formats panel showing US Letter and A4 files plus digital-delivery details."],
] as const;

export function PokopiaCompletePlayerSystemStage({ offer, sourceOrderId, cumulativeEnabled = false, p18Ready = false }: { offer: PokopiaFunnelOffer; sourceOrderId: string; sourceProductId: "P06" | "P16"; cumulativeEnabled?: boolean; p18Ready?: boolean }) {
  const track = useFunnelTracking();
  const trackCanonical = useCanonicalFunnelTracking();
  // Session storage is browser-only. Deferring it until after hydration keeps
  // the server HTML and the first client render identical.
  const [state, setState] = useState<ReturnType<typeof getCurrentFunnelState>>(null);
  const [status, setStatus] = useState<string | null>(null);
  const cumulative = useCumulativeJourney(cumulativeEnabled);
  useEffect(() => { setState(getCurrentFunnelState()); }, []);
  const checkoutReady = Boolean(p18Ready && offer.enabled && offer.assetReady && offer.fulfillmentReady && offer.catalogProductId && state);
  async function buy() {
    if (cumulativeEnabled) { if (!p18Ready) { setStatus("Complete Player System checkout remains unavailable until its approved Stripe price and delivery manifest are configured."); return; } const result = await cumulative.act("p18_accepted"); if (result.nextRoute) { trackCanonical("p18_buy_clicked", { funnelStep: "complete-player-system", productId: "P18", productPriceCents: 2499, selectedProducts: result.journey?.selectedProducts, cartValueCents: result.journey?.currentTotalCents }); window.location.assign(result.nextRoute); } else setStatus(result.error ?? "Checkout is unavailable right now."); return; }
    if (!checkoutReady || !state || !offer.catalogProductId) { setStatus("Complete Player System purchasing is not available yet."); return; }
    track("pokopia_p18_checkout_started", offer.funnelPrice); trackCanonical("p18_buy_clicked", { funnelStep: "complete-player-system", productId: "P18", productPriceCents: 2499, selectedProducts: ["P18"], cartValueCents: 2499 });
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: "P18", offerId: offer.id, sku: offer.productSku, upgrade: true, funnelId: state.funnelId, funnelStep: "complete-player-system", funnelSession: state.sessionId, sourceOrderId, attribution: readStoredAttributionForCheckout() }) });
    const result = await response.json() as { checkoutUrl?: string; error?: string };
    if (response.ok && result.checkoutUrl) { trackCanonical("checkout_started", { funnelStep: "checkout", productId: "P18", productPriceCents: 2499, selectedProducts: ["P18"], cartValueCents: 2499 }); window.location.assign(result.checkoutUrl); } else setStatus(result.error ?? "Checkout is unavailable right now.");
  }
  async function skip() {
    if (cumulativeEnabled) { const result = await cumulative.act("p18_skipped"); if (result.nextRoute) trackCanonical("p18_skipped", { funnelStep: "complete-player-system", productId: "P18", productPriceCents: 2499, selectedProducts: result.journey?.selectedProducts, cartValueCents: result.journey?.currentTotalCents }); window.location.assign(result.nextRoute ?? "/pokopia/completionist-kit"); return; }
    track("pokopia_p18_skipped", offer.funnelPrice); trackCanonical("p18_skipped", { funnelStep: "complete-player-system", productId: "P18", productPriceCents: 2499, selectedProducts: ["P18"], cartValueCents: 0 });
    await fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "p18_skipped", sourceOrderId }) });
    window.location.assign("/pokopia/completionist-kit");
  }
  return <FunnelFrame step="complete-player-system">
    <section className="p18-hero">
      <div className="p18-hero__copy">
        <p className="eyebrow">READY FOR THE COMPLETE SYSTEM?</p>
        <h1><span>POKOPIA</span><br />COMPLETE PLAYER<br />SYSTEM</h1>
        <p className="p18-hero__lede">Your complete planning, tracking, and completion system for a more organized Pokopia adventure.</p>
        <p className="p18-hero__lede">Built for players who want one place to decide what to work on, track what matters, remember where they left off, and make steady progress with less guesswork.</p>
        <div className="p18-hero__price"><span className="p18-hero__regular-label">REGULAR PRICE</span><span className="p18-hero__regular">${offer.regularPrice?.toFixed(2)}</span><strong>${offer.funnelPrice?.toFixed(2)}</strong><em>LAUNCH PRICE</em><small>ONE-TIME PURCHASE<br />11 CONNECTED TOOLS<br />US LETTER + A4 PDFs</small></div>
        <ul className="p18-hero__chips" aria-label="Complete Player System highlights"><li><span>⌂</span>MY POKOPIA HQ</li><li><span>✦</span>11 CONNECTED TOOLS</li><li><span>▤</span>US LETTER + A4</li><li><span>↓</span>INSTANT ACCESS</li></ul>
        <ul className="p18-hero__benefits"><li>My Pokopia HQ 3-page control center</li><li>Daily, weekly, and long-term planning tools</li><li>Master progress, roadmap, and resource tracking</li><li>Field guide, trackers, build planning, and dashboard</li><li>Instant digital access</li></ul>
        {cumulativeEnabled && cumulative.journey && <FunnelCartSummary journey={cumulative.journey} label="Add Complete Player System" deltaCents={2499} newTotalCents={cumulative.journey.currentTotalCents + 2499} />}
        <div className="p18-hero__actions"><button className="action-link action-link--primary" type="button" onClick={buy} disabled={cumulativeEnabled ? !p18Ready || !cumulative.ready : !checkoutReady}>{cumulativeEnabled ? (p18Ready ? "BUY" : "COMPLETE PLAYER SYSTEM UNAVAILABLE") : checkoutReady ? "BUY" : "COMPLETE PLAYER SYSTEM UNAVAILABLE"}</button><button className="p18-hero__skip" type="button" onClick={skip} disabled={cumulativeEnabled && !cumulative.ready}>SKIP</button></div>
        {status && <p className="focused-funnel__status" role="status">{status}</p>}{!cumulativeEnabled && !checkoutReady && <p className="focused-funnel__status">Complete Player System purchasing is not available yet.</p>}
        <p className="p18-hero__digital">DIGITAL DOWNLOAD · NO PHYSICAL ITEM SHIPS</p>
      </div>
      <div className="p18-scene" aria-label="Pokopia Complete Player System printable preview collection">
        <Image className="p18-scene__background" src="/assets/products/pokopia/complete-player-system/p18-complete-player-system-hero-environment-v2.png" alt="" width={1448} height={1086} priority />
        <div className="p18-scene__core" aria-label="Core planning system">
          {corePreviews.map(([id, src, alt, width, height]) => <Image className={`p18-scene__primary p18-scene__primary--${id}`} key={src} src={src} alt={alt} width={width} height={height} />)}
        </div>
        <div className="p18-scene__support-group p18-scene__support-group--left" aria-label="Daily support tools">
          {leftSupportPreviews.map(([id, src, alt, width, height]) => <Image className={`p18-scene__support p18-scene__support--${id}`} key={src} src={src} alt={alt} width={width} height={height} />)}
        </div>
        <div className="p18-scene__support-group p18-scene__support-group--right" aria-label="Reference and dashboard tools">
          {rightSupportPreviews.map(([id, src, alt, width, height]) => <Image className={`p18-scene__support p18-scene__support--${id}`} key={src} src={src} alt={alt} width={width} height={height} />)}
        </div>
        <Image className={`p18-scene__primary p18-scene__primary--${hqPreview[0]}`} src={hqPreview[1]} alt={hqPreview[2]} width={hqPreview[3]} height={hqPreview[4]} />
      </div>
    </section>
    <section className="p18-value" aria-labelledby="p18-value-heading"><h2 id="p18-value-heading">A COMPLETE PLAYER SYSTEM, DESIGNED TO WORK TOGETHER</h2><p>See how the connected tools help you plan, track, organize, and complete more of your adventure.</p><div className="p18-value__grid">
      {valuePanels.map(([id, title, src, alt]) => <article className="p18-value__panel" key={id} aria-labelledby={`p18-value-${id}`}><h3 id={`p18-value-${id}`} className="sr-only">{title}</h3><Image src={src} alt={alt} width={id === "my-pokopia-hq" ? 1312 : id === "complete-system" ? 1270 : id === "digital-download-formats" ? 1448 : 1412} height={id === "my-pokopia-hq" ? 1199 : id === "complete-system" ? 1089 : id === "digital-download-formats" ? 1086 : 1114} unoptimized /></article>)}
    </div></section>
    <ul className="p18-trust" aria-label="Purchase reassurance"><li>Instant digital access</li><li>Print-friendly PDFs</li><li>Secure checkout with Stripe</li><li>No physical item ships</li></ul>
  </FunnelFrame>;
}
