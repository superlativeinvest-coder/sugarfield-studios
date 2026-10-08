"use client";

import { useEffect } from "react";
import { initializeTikTokPixel } from "@/lib/analytics/tiktok-pixel";
import { CONSENT_CHANGED_EVENT, readConsent, type SugarfieldConsentState } from "@/lib/privacy/consent";

export function TikTokPixelLoader() {
  useEffect(() => {
    initializeTikTokPixel();
    const handleConsentChange = (event: Event) => {
      const state = (event as CustomEvent<SugarfieldConsentState>).detail ?? readConsent();
      if (state.advertising === "granted") {
        initializeTikTokPixel();
      } else {
        try { window.ttq?.disableCookie?.(); } catch { /* Pixel cleanup is best effort; dispatch remains consent-gated. */ }
      }
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
  }, []);

  return null;
}
