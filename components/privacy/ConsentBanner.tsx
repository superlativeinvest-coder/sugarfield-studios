"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGED_EVENT, readConsent, setAdvertisingConsent, type SugarfieldConsentState } from "@/lib/privacy/consent";

function syncServerAdvertisingConsent(choice: "granted" | "denied"): void {
  try {
    void fetch("/api/privacy/advertising-consent", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: choice }),
    }).catch(() => undefined);
  } catch {
    // The browser preference remains usable when the server bridge is unavailable.
  }
}

export function ConsentBanner() {
  const [consent, setConsent] = useState<SugarfieldConsentState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<SugarfieldConsentState>).detail;
      setConsent(detail ?? readConsent());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sugarfield_consent_v1") setConsent(readConsent());
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, handleConsentChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!consent) return null;
  const undecided = consent.advertising === "unknown";

  return (
    <aside className={`consent-control${undecided || open ? " consent-control--panel" : " consent-control--manage"}`} aria-label="Privacy choices">
      {undecided || open ? (
        <div className="consent-control__panel" role="region" aria-labelledby="consent-title" aria-describedby="consent-description">
          <p className="eyebrow">Privacy choices</p>
          <h2 id="consent-title">Choose how advertising works</h2>
          <p id="consent-description">Sugarfield&apos;s first-party operational analytics continue separately. The TikTok advertising Pixel loads only if you allow advertising cookies.</p>
          <p className="consent-control__policy"><a href="/privacy">Read the privacy disclosure</a></p>
          <div className="consent-control__actions">
            <button type="button" className="action-link action-link--secondary" onClick={() => { setAdvertisingConsent("denied"); syncServerAdvertisingConsent("denied"); setOpen(false); }}>Reject advertising</button>
            <button type="button" className="action-link action-link--primary" onClick={() => { setAdvertisingConsent("granted"); syncServerAdvertisingConsent("granted"); setOpen(false); }}>Allow advertising</button>
          </div>
        </div>
      ) : (
        <button type="button" className="consent-control__manage" onClick={() => setOpen(true)}>Privacy choices</button>
      )}
    </aside>
  );
}
