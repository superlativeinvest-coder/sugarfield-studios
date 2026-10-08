"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { FunnelFrame, useCanonicalFunnelTracking, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import { ProductPreviewFan, quickStartPreviewPages } from "@/components/pokopia/ProductPreviewFan";
import { captureAttribution, toLegacyAttribution } from "@/lib/attribution/capture";
import { createFunnelSession, readFunnelState, writeFunnelState } from "@/lib/pokopia-funnel/state";
import { trackSugarfieldEvent } from "@/lib/analytics/events";

const playerProblems = [
  ["01", "Start with a focus", "Choose a useful direction for the session before the map gets busy."],
  ["02", "Remember small tasks", "Keep daily priorities in one practical, printable place."],
  ["03", "Save your ideas", "Make room for island sketches and rare-finds notes as you play."],
] as const;
const accessSteps = [
  ["01", "Enter your email", "Use the form above to claim the free Quick Start Pack."],
  ["02", "Claim the guide", "Your claim starts the secure Quick Start access flow."],
  ["03", "Choose a format", "Access the US Letter or A4 PDF when your access is available."],
] as const;
const supportedBenefits = ["Set a goal before you begin.", "Keep daily priorities visible.", "Capture a cloud-island sketch.", "Make a home for rare-finds notes."] as const;

export function PokopiaStarterStage() {
  const offer = pokopiaFunnelOffers.freeStarter;
  const track = useFunnelTracking();
  const trackCanonical = useCanonicalFunnelTracking();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const accessPanelRef = useRef<HTMLElement>(null);
  const stagingAuthTestEnabled = process.env.NEXT_PUBLIC_STAGING_AUTH_TEST === "true";

  useEffect(() => {
    trackSugarfieldEvent({ event: "pokopia_quick_start_viewed", funnel_id: "pokopia_daily_reset", funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku });
  }, [offer.productId, offer.productSku]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quick_start_access") !== "1") return;
    window.history.replaceState({}, "", "/pokopia/start");
    void grantQuickStartAccess();
  // This URL flag is consumed once immediately after the auth callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const focusAccessPanel = () => {
      if (window.location.hash === "#quick-start-access") window.setTimeout(() => accessPanelRef.current?.focus(), 0);
    };
    focusAccessPanel();
    window.addEventListener("hashchange", focusAccessPanel);
    return () => window.removeEventListener("hashchange", focusAccessPanel);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quick_start_access") === "1") return;
    let active = true;
    void restoreQuickStartAccess();
    return () => { active = false; };
    async function restoreQuickStartAccess() {
      try {
        const response = await fetch("/api/pokopia/quick-start/access", { cache: "no-store" });
        const result = await response.json() as { accessGranted?: boolean };
        if (active) setAccessReady(response.ok && result.accessGranted === true);
      } catch {
        if (active) setAccessReady(false);
      } finally {
        if (active) setAccessResolved(true);
      }
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setStatus(null);
    const state = readFunnelState(window.sessionStorage) ?? createFunnelSession();
    const attribution = captureAttribution(window.location.search, window.localStorage, window.sessionStorage, { landingPage: window.location.pathname, referrer: document.referrer });
    trackSugarfieldEvent({ event: "pokopia_quick_start_signup_started", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...toLegacyAttribution(attribution.currentTouch) });
    try {
      const response = await fetch("/api/pokopia/funnel/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, funnelSessionId: state.sessionId, attribution }) });
      const result = await response.json() as { nextRoute?: string; error?: string };
      if (!response.ok || result.nextRoute !== "/pokopia/daily-reset") { setStatus(result.error ?? "We could not secure your Quick Start Pack right now."); return; }
      state.leadCaptured = true; state.entryOffer = "pokopia_quick_start_pack"; state.lastStep = "daily-reset"; state.email = email.trim().toLowerCase(); state.utm = attribution.currentTouch; writeFunnelState(window.sessionStorage, state);
      trackCanonical("email_submitted", { funnelStep: "start", sessionId: state.sessionId, productId: offer.productId });
      trackCanonical("quick_start_claimed", { funnelStep: "start", sessionId: state.sessionId, productId: offer.productId });
      trackSugarfieldEvent({ event: "pokopia_quick_start_signup_completed", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...toLegacyAttribution(attribution.currentTouch) });
      track("pokopia_lead_captured");
      window.location.assign(result.nextRoute);
    } catch { setStatus("We could not secure your Quick Start Pack right now."); }
    finally { setLoading(false); }
  }
  async function grantQuickStartAccess() {
    setLoading(true); setStatus("Preparing secure access…");
    const state = readFunnelState(window.sessionStorage) ?? createFunnelSession();
    const attribution = captureAttribution(window.location.search, window.localStorage, window.sessionStorage, { landingPage: window.location.pathname, referrer: document.referrer });
    try {
      const response = await fetch("/api/pokopia/quick-start/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ funnelSession: state.sessionId, firstTouchAttribution: attribution.firstTouch, currentTouchAttribution: attribution.currentTouch }) });
      const result = await response.json() as { accessGranted?: boolean; error?: string };
      if (!response.ok || result.accessGranted !== true) { setStatus(result.error ?? "We could not prepare secure access right now."); return; }
      state.leadCaptured = true; state.entryOffer = "pokopia_quick_start_pack"; state.lastStep = "start"; state.utm = attribution.currentTouch; writeFunnelState(window.sessionStorage, state); setAccessReady(true); setStatus(null);
      void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quick_start_claimed", funnelSessionId: state.sessionId, attribution }) });
      trackCanonical("quick_start_claimed", { funnelStep: "start", sessionId: state.sessionId, productId: offer.productId });
      trackSugarfieldEvent({ event: "pokopia_quick_start_signup_completed", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...toLegacyAttribution(attribution.currentTouch) });
      track("pokopia_lead_captured");
    } catch { setStatus("We could not prepare secure access right now."); }
    finally { setLoading(false); setAccessResolved(true); }
  }
  async function download(fileId: "letter" | "a4") {
    const event = fileId === "letter" ? "pokopia_quick_start_download_letter" : "pokopia_quick_start_download_a4";
    const state = readFunnelState(window.sessionStorage);
    trackSugarfieldEvent({ event, funnel_id: state?.funnelId ?? "pokopia_daily_reset", funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state?.sessionId });
    try {
      const response = await fetch(`/api/pokopia/quick-start/downloads/${fileId}`); const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) { setStatus(result.error ?? "Secure download is unavailable right now."); return; }
      window.location.assign(result.url);
    } catch { setStatus("Secure download is unavailable right now."); }
  }
  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthLoading(true); setAuthStatus(null);
    try {
      const response = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, next: "/pokopia/start?quick_start_access=1#quick-start-access" }) });
      const result = await response.json() as { sent?: boolean; error?: string };
      setAuthStatus(response.ok && result.sent ? "Your secure sign-in link is on its way. Open it in this browser to restore access." : result.error ?? "We could not send a sign-in link.");
    } catch { setAuthStatus("We could not send a sign-in link."); }
    finally { setAuthLoading(false); }
  }
  async function verifyServerSession() {
    setSessionStatus(null);
    try {
      const response = await fetch("/api/library", { cache: "no-store" });
      setSessionStatus(response.status === 401 ? "No server-side session was found." : response.ok ? "Server-side session confirmed." : "Server-side session confirmed; the customer library is not configured in staging.");
    } catch { setSessionStatus("We could not verify the server-side session."); }
  }
  function clickDailyReset() { const state = readFunnelState(window.sessionStorage); trackSugarfieldEvent({ event: "pokopia_quick_start_daily_reset_clicked", funnel_id: state?.funnelId ?? "pokopia_daily_reset", funnel_version: "v1", page_path: window.location.pathname, product_id: "P06", sku: "P06", funnel_session: state?.sessionId }); }
  function focusSignup() {
    const input = emailInputRef.current;
    if (!input) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reducedMotion ? "auto" : "smooth";
    input.scrollIntoView({ behavior, block: "center" });
    window.setTimeout(() => {
      const consentPanel = document.querySelector<HTMLElement>(".consent-control__panel");
      const inputBox = input.getBoundingClientRect();
      const panelBox = consentPanel?.getBoundingClientRect();
      if (panelBox && inputBox.top < panelBox.bottom + 16) window.scrollBy({ top: inputBox.top - panelBox.bottom - 16, behavior });
      input.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 350);
  }

  return <FunnelFrame step="start" variant="quick-start">
    <section className="quick-start-hero" aria-labelledby="quick-start-title"><div className="quick-start-hero__inner">
      <div className="quick-start-hero__copy"><p className="eyebrow">FREE 7-PAGE POKOPIA PRINTABLE</p><h1 id="quick-start-title">START YOUR POKOPIA ADVENTURE ORGANIZED.</h1><p className="quick-start-hero__lede">Plan your next Pokopia session with a simple printable guide for goals, daily priorities, island ideas, and rare finds.</p><div className="quick-start-hero__facts" aria-label="Quick Start Pack details"><span>FREE PDF</span><span>7 PAGES</span><span>US LETTER + A4</span></div>{!accessResolved ? <p className="focused-funnel__status" role="status">Restoring secure access…</p> : !accessReady ? <form className="focused-funnel__form quick-start-claim-form" data-quick-start-claim-form onSubmit={submit}><label htmlFor="pokopia-starter-email">Email address</label><div><input ref={emailInputRef} id="pokopia-starter-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><button type="submit" disabled={loading}>{loading ? "SECURING YOUR PACK…" : "GET MY FREE QUICK START"}</button></div>{status && <p className="focused-funnel__status" role="alert">{status}</p>}<p className="focused-funnel__microcopy">Free to claim. No card or password required.</p></form> : <p className="focused-funnel__status" role="status">Your Quick Start Pack is ready below.</p>}</div>
      <div className="quick-start-hero__art">{quickStartPreviewPages.slice(0, 3).map((page, index) => <figure className={`quick-start-hero__sheet quick-start-hero__sheet--${index + 1}`} key={page.src}><Image src={page.src} alt={page.alt} width={2550} height={3300} sizes="(max-width: 640px) 58vw, (max-width: 1100px) 34vw, 330px" priority={index === 0} /></figure>)}<span className="quick-start-hero__art-label">REAL PRINTABLE PAGES</span></div>
    </div></section>
    <section className="quick-start-section quick-start-problems" aria-labelledby="quick-start-problems-title"><div className="quick-start-section__inner"><p className="eyebrow">A SIMPLE PLACE TO BEGIN</p><h2 id="quick-start-problems-title">WHEN YOU WANT TO PLAY, NOT WONDER WHAT TO DO NEXT.</h2><div className="quick-start-problems__grid">{playerProblems.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="quick-start-section quick-start-gallery" aria-labelledby="quick-start-gallery-title"><div className="quick-start-section__inner"><p className="eyebrow">A REAL FIVE-PAGE PREVIEW</p><h2 id="quick-start-gallery-title">SEE WHAT YOU’LL USE BEFORE YOU CLAIM IT.</h2><p className="quick-start-section__lede">The pack contains seven pages. These are the five approved preview pages currently available for customer-facing display.</p><ProductPreviewFan /></div></section>
    <section className="quick-start-section quick-start-access-steps" aria-labelledby="quick-start-steps-title"><div className="quick-start-section__inner"><p className="eyebrow">HOW ACCESS WORKS</p><h2 id="quick-start-steps-title">A SMALL, SECURE START.</h2><ol>{accessSteps.map(([number, title, copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></div></section>
    <section className="quick-start-section quick-start-benefits" aria-labelledby="quick-start-benefits-title"><div className="quick-start-section__inner quick-start-benefits__inner"><figure><Image src={quickStartPreviewPages[3].src} alt={quickStartPreviewPages[3].alt} width={2550} height={3300} sizes="(max-width: 820px) 72vw, 430px" /></figure><div><p className="eyebrow">FOR YOUR NEXT SESSION</p><h2 id="quick-start-benefits-title">A LIGHTWEIGHT GUIDE FOR THE MOMENTS YOU WANT A LITTLE DIRECTION.</h2><ul>{supportedBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></div></div></section>
    {!accessReady && <section className="quick-start-final" aria-labelledby="quick-start-final-title"><div className="quick-start-section__inner"><p className="eyebrow">READY WHEN YOU ARE</p><h2 id="quick-start-final-title">START YOUR NEXT SESSION WITH A SIMPLE PLAN.</h2><p>Claim the free seven-page printable pack. US Letter and A4 formats are included.</p><button type="button" onClick={focusSignup}>GET MY FREE QUICK START</button><small>Returns you to the original signup form and places focus in the email field.</small></div></section>}
    <section ref={accessPanelRef} id="quick-start-access" tabIndex={-1} className="quick-start-recovery" aria-labelledby="quick-start-access-title"><div className="quick-start-section__inner"><p className="eyebrow">EXISTING ACCESS</p><h2 id="quick-start-access-title">RETURN TO YOUR QUICK START PACK</h2>{!accessResolved ? <p role="status">Checking your secure access…</p> : accessReady ? <><p>Choose the print format you need.</p><div className="focused-funnel__actions"><button className="action-link action-link--primary" type="button" onClick={() => download("letter")}>DOWNLOAD US LETTER</button><button className="action-link action-link--secondary" type="button" onClick={() => download("a4")}>DOWNLOAD A4</button></div><Link className="focused-funnel__quiet-link" href="/pokopia/daily-reset" onClick={clickDailyReset}>Explore the Pokopia Daily Reset System</Link></> : <form className="focused-funnel__form" onSubmit={requestMagicLink}><label htmlFor="pokopia-access-email">Email address</label><div><input id="pokopia-access-email" name="access-email" type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required /><button type="submit" disabled={authLoading}>{authLoading ? "SENDING SECURE LINK…" : "EMAIL MY SECURE ACCESS LINK"}</button></div><p className="focused-funnel__microcopy">Use the email you used to secure the pack. No password is required.</p></form>}{authStatus && <p className="focused-funnel__status" role="alert">{authStatus}</p>}</div></section>
    {stagingAuthTestEnabled && <section className="quick-start-staging"><button className="action-link action-link--secondary" type="button" onClick={verifyServerSession}>VERIFY STAGING SERVER SESSION</button>{sessionStatus && <p className="focused-funnel__status" role="status">{sessionStatus}</p>}</section>}
  </FunnelFrame>;
}
