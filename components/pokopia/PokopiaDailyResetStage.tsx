"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { isOfferCheckoutReady, pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { FunnelFrame, getCurrentFunnelState, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import { STORAGE_KEY } from "@/lib/attribution/capture";
import { useCumulativeJourney } from "@/components/pokopia/useCumulativeJourney";
import { FunnelCartSummary } from "@/components/pokopia/FunnelCartSummary";

function readStoredAttribution(): { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } | undefined {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } : undefined;
  } catch { return undefined; }
}

export function PokopiaDailyResetStage({ cumulativeEnabled = false }: { cumulativeEnabled?: boolean }) {
  const offer = pokopiaFunnelOffers.dailyReset;
  const ready = isOfferCheckoutReady(offer);
  const track = useFunnelTracking();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasLead = Boolean(getCurrentFunnelState()?.leadCaptured);
  const cumulative = useCumulativeJourney(cumulativeEnabled);

  const skip = () => {
    const state = getCurrentFunnelState();
    if (state) { state.dailyResetSkipped = true; state.lastStep = "companion"; window.sessionStorage.setItem("sugarfield_pokopia_daily_reset_funnel", JSON.stringify(state)); }
    track("pokopia_daily_reset_skipped", offer.funnelPrice);
    void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "daily_reset_skipped" }) });
  };

  async function buy() {
    if (cumulativeEnabled) { const result = await cumulative.act("daily_reset_accepted"); if (result.nextRoute) window.location.assign(result.nextRoute); else setStatus(result.error ?? "Your setup could not be updated."); return; }
    const state = getCurrentFunnelState();
    if (!state) { setStatus("Start with the free starter so we can preserve your funnel session."); return; }
    setLoading(true); setStatus(null); track("pokopia_daily_reset_checkout_started", offer.funnelPrice);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: offer.catalogProductId ?? "P06", offerId: offer.id, sku: offer.catalogProductId ?? "P06", upgrade: false, funnelId: state.funnelId, funnelStep: "daily_reset", funnelSession: state.sessionId, attribution: readStoredAttribution() }) });
      const result = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) { setStatus(result.error ?? "Stripe Checkout is unavailable right now."); return; }
      window.location.assign(result.checkoutUrl);
    } catch { setStatus("Stripe Checkout is unavailable right now. Please try again later."); }
    finally { setLoading(false); }
  }

  return <FunnelFrame step="daily-reset">
    <section className="daily-reset-hero">
      <div className="daily-reset-hero__copy">
        {hasLead && <div className="daily-reset-success" role="status"><strong>YOU’RE IN!</strong><span>Your Quick Start Pack is on its way.</span></div>}
        <p className="eyebrow">POKOPIA DAILY SYSTEM</p>
        <p className="daily-reset-hero__transition"><span>YOUR QUICK START GETS YOU GOING.</span><span>DAILY RESET KEEPS YOU ON TRACK.</span></p>
        <h1>POKOPIA<br />DAILY RESET CHECKLIST</h1>
        <p className="focused-funnel__lede">Use the Daily Reset Checklist before each session to organize your priorities, daily checks, reminders, and evening prep in one place.</p>
      </div>
      <div className="daily-reset-hero__price-block">
        <div className="daily-reset-hero__price"><strong>${offer.funnelPrice?.toFixed(2)}</strong><div><span>ONE-TIME PURCHASE</span><span>US LETTER + A4 PDFs</span></div></div>
      </div>
      <div className="daily-reset-scene" aria-label="Cozy daily planning station with approved Daily Reset printable pages">
        <Image className="daily-reset-scene__art" src="/assets/products/pokopia/daily-reset/p06-daily-reset-sunlit-window-world.png" alt="" aria-hidden="true" width={1171} height={1343} priority sizes="(max-width: 820px) 100vw, 58vw" />
        <div className="daily-reset-scene__pages" aria-label="Approved Pokopia Daily Reset Checklist printable pages">
          <figure className="daily-reset-scene__page daily-reset-scene__page--daily"><Image src="/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-1.png" alt="Pokopia Daily Reset Checklist printable page with morning priorities, daily checks, and reminders" width={1103} height={1426} priority sizes="(max-width: 520px) 54vw, 27vw" /></figure>
          <figure className="daily-reset-scene__page daily-reset-scene__page--evening"><Image src="/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-2.png" alt="Pokopia Daily Reset Evening Prep and Notes printable page" width={1103} height={1426} sizes="(max-width: 520px) 46vw, 24vw" /></figure>
        </div>
      </div>
      <div className="daily-reset-hero__details">
        <ul className="daily-reset-hero__benefits">{offer.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
        <div className="daily-reset-hero__actions">
          {cumulativeEnabled ? <button type="button" onClick={buy} disabled={loading}>{loading ? "UPDATING SETUP…" : "ADD DAILY RESET — $4.99"}</button> : ready ? <button type="button" onClick={buy} disabled={loading}>{loading ? "CONNECTING TO STRIPE…" : "ADD DAILY RESET TO MY SYSTEM →"}</button> : <button type="button" disabled aria-describedby="daily-reset-unavailable">ADD DAILY RESET TO MY SYSTEM →</button>}
          <Link href="/pokopia/funnel/companion" onClick={skip}>No thanks, continue without Daily Reset</Link>
        </div>
        {!ready && <p id="daily-reset-unavailable" className="focused-funnel__status">Checkout is not available yet: the Stripe price and fulfillment mapping are still pending.</p>}
        {cumulativeEnabled && <FunnelCartSummary journey={cumulative.journey} label="Add Daily Reset" deltaCents={499} newTotalCents={499} />}
        {status && <p className="focused-funnel__status" role="alert">{status}</p>}
      </div>
    </section>
    <section className="daily-reset-proof" aria-labelledby="daily-reset-proof-title">
      <Image className="daily-reset-proof__art" src="/assets/products/pokopia/daily-reset/p06-daily-reset-proof-surround-v2.webp" alt="" aria-hidden="true" width={1536} height={1024} sizes="(max-width: 820px) 100vw, 90vw" />
      <div className="daily-reset-proof__intro"><h2 id="daily-reset-proof-title">EVERY PART OF YOUR DAY, IN ONE PLACE</h2><p>A simple checklist to help you get more out of your Pokopia adventure.</p></div>
      <div className="daily-reset-proof__cards">
        <article className="daily-reset-proof__card--morning"><h3>MORNING PRIORITIES</h3><figure><Image src="/assets/products/pokopia/daily-reset/p06-proof-morning-priorities.png" alt="Morning Priorities checklist section from the Daily Reset" width={533} height={423} sizes="(max-width: 520px) 78vw, (max-width: 820px) 34vw, 40vw" /></figure><p>Start your session with your top daily priorities.</p></article>
        <article className="daily-reset-proof__card--habitat"><h3>HABITAT &amp; EXPLORATION</h3><figure><Image src="/assets/products/pokopia/daily-reset/p06-proof-habitat-exploration.png" alt="Habitat and Exploration checklist section from the Daily Reset" width={547} height={428} sizes="(max-width: 520px) 78vw, (max-width: 820px) 34vw, 40vw" /></figure><p>Track Dream Islands, habitat checks, digging, and resources.</p></article>
        <article className="daily-reset-proof__card--farming"><h3>FARMING &amp; COOKING</h3><figure><Image src="/assets/products/pokopia/daily-reset/p06-proof-farming-cooking.png" alt="Farming and Cooking checklist section from the Daily Reset" width={532} height={397} sizes="(max-width: 520px) 78vw, (max-width: 820px) 34vw, 40vw" /></figure><p>Keep crops, meals, and ingredient restocking on track.</p></article>
        <article className="daily-reset-proof__card--mosslax"><h3>MOSSLAX &amp; REMINDERS</h3><figure><Image src="/assets/products/pokopia/daily-reset/p06-proof-mosslax-reminders.png" alt="Mosslax and reset reminders checklist section from the Daily Reset" width={547} height={390} sizes="(max-width: 520px) 78vw, (max-width: 820px) 34vw, 40vw" /></figure><p>Remember daily Mosslax tasks and important reset reminders.</p></article>
      </div>
    </section>
    <section className="daily-reset-trust" aria-label="Daily Reset delivery details"><span>Instant digital access</span><span>Print-friendly PDFs</span><span>Secure checkout with Stripe</span><span>2-page daily checklist</span></section>
    <div className="daily-reset-scenic-footer" aria-hidden="true"><Image src="/assets/products/pokopia/daily-reset/p06-daily-reset-footer-v2.webp" alt="" width={2172} height={724} sizes="100vw" /></div>
  </FunnelFrame>;
}
