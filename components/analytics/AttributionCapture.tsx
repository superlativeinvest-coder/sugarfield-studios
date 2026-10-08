"use client";

import { useEffect } from "react";
import { ANONYMOUS_ID_COOKIE, ANONYMOUS_ID_MAX_AGE, captureAttribution, ensureAnonymousId } from "@/lib/attribution/capture";

export function AttributionCapture() {
  useEffect(() => {
    ensureAnonymousId(document.cookie, (value) => { document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(value)}; Max-Age=${ANONYMOUS_ID_MAX_AGE}; Path=/; SameSite=Lax`; });
    captureAttribution(window.location.search, window.localStorage, window.sessionStorage, { landingPage: window.location.pathname, referrer: document.referrer });
  }, []);
  return null;
}
