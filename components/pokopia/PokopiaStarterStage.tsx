"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { FunnelFrame, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import { captureAttribution } from "@/lib/attribution/capture";
import { createFunnelSession, readFunnelState, writeFunnelState } from "@/lib/pokopia-funnel/state";
import { trackSugarfieldEvent } from "@/lib/analytics/events";
import { ProductPreviewFan } from "@/components/pokopia/ProductPreviewFan";

export function PokopiaStarterStage() {
  const offer = pokopiaFunnelOffers.freeStarter;
  const track = useFunnelTracking();
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
  const stagingAuthTestEnabled = process.env.NEXT_PUBLIC_STAGING_AUTH_TEST === "true";

  useEffect(() => {
    trackSugarfieldEvent({ event: "pokopia_quick_start_viewed", funnel_id: "pokopia_daily_reset", funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku });
  }, [offer.productId, offer.productSku]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quick_start_access") !== "1") return;
    window.history.replaceState({}, "", "/pokopia/funnel/start");
    void grantQuickStartAccess();
  // This URL flag is consumed once immediately after the auth callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const attribution = captureAttribution(window.location.search, window.localStorage);
    trackSugarfieldEvent({ event: "pokopia_quick_start_signup_started", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...attribution.currentTouch });
    try {
      const response = await fetch("/api/pokopia/funnel/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, funnelSessionId: state.sessionId, attribution }) });
      const result = await response.json() as { nextRoute?: string; error?: string };
      if (!response.ok || result.nextRoute !== "/pokopia/funnel/daily-reset") { setStatus(result.error ?? "We could not secure your Quick Start Pack right now."); return; }
      state.leadCaptured = true; state.entryOffer = "pokopia_quick_start_pack"; state.lastStep = "daily-reset"; state.email = email.trim().toLowerCase(); state.utm = attribution.currentTouch; writeFunnelState(window.sessionStorage, state);
      trackSugarfieldEvent({ event: "pokopia_quick_start_signup_completed", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...attribution.currentTouch });
      track("pokopia_lead_captured");
      window.location.assign(result.nextRoute);
    } catch { setStatus("We could not secure your Quick Start Pack right now."); }
    finally { setLoading(false); }
  }

  async function grantQuickStartAccess() {
    setLoading(true); setStatus("Preparing secure access…");
    const state = readFunnelState(window.sessionStorage) ?? createFunnelSession();
    const attribution = captureAttribution(window.location.search, window.localStorage);
    try {
      const response = await fetch("/api/pokopia/quick-start/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ funnelSession: state.sessionId, firstTouchAttribution: attribution.firstTouch, currentTouchAttribution: attribution.currentTouch }) });
      const result = await response.json() as { accessGranted?: boolean; error?: string };
      if (!response.ok || result.accessGranted !== true) { setStatus(result.error ?? "We could not prepare secure access right now."); return; }
      state.leadCaptured = true; state.entryOffer = "pokopia_quick_start_pack"; state.lastStep = "start"; state.utm = attribution.currentTouch; writeFunnelState(window.sessionStorage, state); setAccessReady(true); setStatus(null);
      void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quick_start_claimed", funnelSessionId: state.sessionId, attribution }) });
      trackSugarfieldEvent({ event: "pokopia_quick_start_signup_completed", funnel_id: state.funnelId, funnel_version: "v1", page_path: window.location.pathname, product_id: offer.productId, sku: offer.productSku, funnel_session: state.sessionId, ...attribution.currentTouch });
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
      const response = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, next: "/pokopia/funnel/daily-reset" }) });
      const result = await response.json() as { sent?: boolean; error?: string };
      setAuthStatus(response.ok && result.sent ? "Staging sign-in link sent. Paste it into this same browser tab." : result.error ?? "We could not send a sign-in link.");
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
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => emailInputRef.current?.focus(), 300);
  }

  return <FunnelFrame step="start"><section className="quick-start-hero"><div className="quick-start-hero__scene" aria-hidden="true" /><div className="quick-start-hero__copy"><p className="eyebrow">FREE POKOPIA PRINTABLE</p><h1><span>START YOUR</span><span>POKOPIA ADVENTURE</span><span>ORGANIZED</span></h1><p className="focused-funnel__lede">Get the free 7-page Quick Start Pack to organize your first sessions with a simple plan.</p><div className="quick-start-hero__facts"><span>FREE</span><span>7 PAGES</span><span>LETTER + A4</span><span>SECURE ACCESS</span></div>{!accessResolved ? <p className="focused-funnel__status" role="status">Restoring secure access…</p> : !accessReady ? <form className="focused-funnel__form" onSubmit={submit}><label htmlFor="pokopia-starter-email">Email address</label><div><input ref={emailInputRef} id="pokopia-starter-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><button type="submit" disabled={loading}>{loading ? "SECURING YOUR PACK…" : offer.cta}</button></div>{status && <p className="focused-funnel__status" role="alert">{status}</p>}<p className="focused-funnel__microcopy">Your pack is secured by email and your Pokopia journey starts immediately.</p></form> : <div className="quick-start-access" id="quick-start-access" role="status"><strong>Your Quick Start Pack is ready.</strong><p>Choose a printable format:</p><div className="focused-funnel__actions"><button className="action-link action-link--primary" type="button" onClick={() => download("letter")}>DOWNLOAD US LETTER</button><button className="action-link action-link--secondary" type="button" onClick={() => download("a4")}>DOWNLOAD A4</button></div>{status && <p className="focused-funnel__status" role="alert">{status}</p>}<Link className="focused-funnel__quiet-link" href="/pokopia/funnel/daily-reset" onClick={clickDailyReset}>Explore the Pokopia Daily Reset System</Link></div>}{stagingAuthTestEnabled && <form className="focused-funnel__form" onSubmit={requestMagicLink}><label htmlFor="pokopia-staging-auth-email">Staging passwordless sign-in</label><div><input id="pokopia-staging-auth-email" name="staging-auth-email" type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="authorized-test@example.com" required /><button type="submit" disabled={authLoading}>{authLoading ? "SENDING LINK…" : "SEND STAGING SIGN-IN LINK"}</button></div>{authStatus && <p className="focused-funnel__status" role="status">{authStatus}</p>}<p className="focused-funnel__microcopy">Available only in the staging dev server. Use an authorized test email.</p></form>}</div></section><section className="quick-start-product" aria-labelledby="quick-start-preview-title"><div className="quick-start-product__intro"><p className="eyebrow">A real seven-page printable pack</p><h2 id="quick-start-preview-title">7 PAGES TO HELP YOU START ORGANIZED.</h2><p>Preview five of the actual included pages, then download all seven after secure sign-in.</p></div><ProductPreviewFan /><ul className="quick-start-product__benefits"><li>Set your focus</li><li>Use a mini daily reset</li><li>Know what to do next</li><li>Sketch your island</li><li>Track rare finds</li></ul>{accessResolved && !accessReady && <><button className="quick-start-product__cta" type="button" onClick={focusSignup}>GET THE FREE 7-PAGE QUICK START PACK</button><p className="quick-start-product__reassurance">Free pack delivery is secured by your email. No card or password is required.</p></>}<div className="quick-start-product__trust" aria-label="Quick Start Pack details"><span>Secure sign-in</span><span>Print-friendly</span><span>US Letter + A4</span><span>Secure access</span><span>7-page Quick Start</span></div></section>{stagingAuthTestEnabled && <section className="quick-start-product"><button className="action-link action-link--secondary" type="button" onClick={verifyServerSession}>VERIFY STAGING SERVER SESSION</button>{sessionStatus && <p className="focused-funnel__status" role="status">{sessionStatus}</p>}</section>}<p className="focused-funnel__asset-note">Fan-made printable tools for Pokopia players.</p></FunnelFrame>;
}
