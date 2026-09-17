"use client";

import Image from "next/image";
import { useEffect } from "react";
import { FunnelFrame, getCurrentFunnelState, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import type { PokopiaFunnelOffer } from "@/data/pokopia-funnel";
import { STORAGE_KEY } from "@/lib/attribution/capture";
import { useCumulativeJourney } from "@/components/pokopia/useCumulativeJourney";
import { FunnelCartSummary } from "@/components/pokopia/FunnelCartSummary";

function readStoredAttribution(): { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } | undefined {
  try { const value = window.sessionStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } : undefined; } catch { return undefined; }
}

export function PokopiaCompletionistStage({ offer, cumulativeEnabled = false }: { offer: PokopiaFunnelOffer; cumulativeEnabled?: boolean }) {
  const track = useFunnelTracking();
  const state = getCurrentFunnelState();
  const cumulative = useCumulativeJourney(cumulativeEnabled);
  const checkoutReady = Boolean(offer.enabled && offer.assetReady && offer.fulfillmentReady && offer.catalogProductId && offer.stripePriceId && state);
  useEffect(() => { void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "p17_downsell_viewed" }) }); }, []);
  async function startCheckout() {
    if (cumulativeEnabled) { const result = await cumulative.act("p17_accepted"); if (result.nextRoute) window.location.assign(result.nextRoute); return; }
    if (!checkoutReady || !state || !offer.catalogProductId) { track("pokopia_completionist_unavailable"); return; }
    track("pokopia_completionist_checkout_started", offer.funnelPrice);
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: offer.catalogProductId, offerId: offer.id, sku: offer.productSku, upgrade: false, funnelId: state.funnelId, funnelStep: "completionist-kit", funnelSession: state.sessionId, attribution: readStoredAttribution() }) });
    const result = await response.json() as { checkoutUrl?: string };
    if (response.ok && result.checkoutUrl) window.location.assign(result.checkoutUrl);
  }
  async function skip() { track("pokopia_p17_skipped", offer.funnelPrice); if (cumulativeEnabled) { const result = await cumulative.act("p17_skipped"); window.location.assign(result.nextRoute ?? "/pokopia/funnel/complete"); return; } await fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "p17_skipped" }) }); window.location.assign("/pokopia/funnel/complete"); }
  const sceneCards = [
    ["cave", "/assets/products/pokopia/completionist-kit/p17-card-cave-mushroom-01.png", "Cave Mushroom printable reference card"],
    ["tomato", "/assets/products/pokopia/completionist-kit/p17-card-farm-tomato-04.png", "Farm Tomato printable reference card"],
    ["wheat", "/assets/products/pokopia/completionist-kit/p17-card-farm-wheat-07.png", "Farm Wheat printable reference card"],
    ["carrot", "/assets/products/pokopia/completionist-kit/p17-card-fresh-carrot-03.png", "Fresh Carrot printable reference card"],
  ] as const;
  const proofCards = [
    ["field-guide-quick-reference", "FIELD GUIDE QUICK REFERENCE", "/assets/products/pokopia/completionist-kit/p17-proof-field-guide-quick-reference.png", "Field Guide quick reference showing Pokémon flavor lookup examples and reference information.", 585, 267],
    ["reference-card-example", "REFERENCE CARD EXAMPLE", "/assets/products/pokopia/completionist-kit/p17-proof-reference-card-example.png", "Reference card example showing best uses, locations, cooking info, pairings, bonuses, rarity, and tips.", 572, 257],
    ["how-cards-help", "HOW THE CARDS HELP", "/assets/products/pokopia/completionist-kit/p17-proof-how-cards-help.png", "How the cards help with ingredient decisions, recipe planning, buff targeting, and completion tracking.", 702, 322],
    ["digital-download-formats", "DIGITAL DOWNLOAD FORMATS", "/assets/products/pokopia/completionist-kit/p17-proof-digital-download-formats.png", "Digital download formats showing US Letter and A4 files plus digital-delivery details.", 712, 332],
  ] as const;
  return <FunnelFrame step="completionist-kit">
    <section className="completionist-hero">
      <div className="completionist-hero__copy">
        <p className="eyebrow">NOT READY FOR THE FULL SYSTEM?</p>
        <h1>POKOPIA<br />COMPLETIONIST KIT</h1>
        <p className="completionist-hero__lede">A smaller completion-focused set for players who still want help tracking what remains—without the full system.</p>
        <div className="completionist-hero__price"><strong>$14.99</strong><span>ONE-TIME PURCHASE<br />US LETTER + A4 PDFs</span></div>
        <ul className="completionist-hero__benefits"><li>Field Guide quick reference</li><li>Field Guide in US Letter and A4</li><li>26-card digital reference collection</li><li>Instant digital access</li></ul>
        {cumulativeEnabled && <FunnelCartSummary journey={cumulative.journey} label="Switch to Completionist Kit" deltaCents={0} newTotalCents={1499} />}
        <div className="completionist-hero__actions"><button className="action-link action-link--primary" type="button" onClick={startCheckout} disabled={cumulativeEnabled ? !cumulative.ready || !cumulative.journey : !checkoutReady}>{cumulativeEnabled ? "SWITCH TO COMPLETIONIST KIT — $14.99" : checkoutReady ? "ADD COMPLETIONIST KIT TO MY SETUP" : "COMPLETIONIST KIT UNAVAILABLE"}</button><button className="completionist-hero__skip" type="button" onClick={skip} disabled={cumulativeEnabled && !cumulative.ready}>No thanks, finish my setup</button></div>
        {!checkoutReady && <p className="focused-funnel__status" role="status">Checkout is unavailable right now.</p>}
        <p className="completionist-hero__digital">DIGITAL DOWNLOAD · NO PHYSICAL ITEM SHIPS</p>
      </div>
      <div className="completionist-scene" aria-label="Pokopia Completionist Kit digital product previews">
        <Image className="completionist-scene__background" src="/assets/products/pokopia/completionist-kit/p17-hero-background-clean.png" alt="" width={1448} height={1086} priority />
        <Image className="completionist-scene__guide" src="/assets/products/pokopia/completionist-kit/p17-field-guide-us-letter-1.png" alt="Pokopia Field Guide quick reference, page 1" width={1188} height={918} />
        {sceneCards.map(([id, src, alt]) => <Image key={src} className={`completionist-scene__card completionist-scene__card--${id}`} src={src} alt={alt} width={1275} height={1650} unoptimized />)}
      </div>
    </section>
    <section className="completionist-proof" aria-labelledby="completionist-proof-heading"><h2 id="completionist-proof-heading">A SMALLER COMPLETION SYSTEM, READY TO USE</h2><p>See what the Field Guide and digital reference cards help you look up, plan, and track.</p><div className="completionist-proof__grid">
      {proofCards.map(([id, title, src, alt, width, height]) => <article key={src} aria-labelledby={`completionist-proof-${id}`}><h3 id={`completionist-proof-${id}`} className="sr-only">{title}</h3><div className="completionist-proof__image"><Image src={src} alt={alt} width={width} height={height} unoptimized /></div></article>)}
    </div></section>
    <ul className="completionist-trust" aria-label="Purchase reassurance"><li>Instant digital access</li><li>Print-friendly PDFs</li><li>Secure checkout with Stripe</li><li>No physical item ships</li></ul>
  </FunnelFrame>;
}
