"use client";

import { useState } from "react";
import { FunnelFrame, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";

export function PokopiaCheckoutStage({ title, totalCents, includes, regularPriceCents }: { title: string; totalCents: number; includes?: string[]; regularPriceCents?: number }) {
  const track = useFunnelTracking(); const [status, setStatus] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function checkout() { setLoading(true); setStatus(null); try { const response = await fetch("/api/pokopia/funnel/checkout", { method: "POST" }); const result = await response.json() as { checkoutUrl?: string; error?: string }; if (!response.ok || !result.checkoutUrl) { setStatus(result.error ?? "Checkout is unavailable right now."); return; } track("pokopia_checkout_started", totalCents / 100); window.location.assign(result.checkoutUrl); } catch { setStatus("Checkout is unavailable right now."); } finally { setLoading(false); } }
  return <FunnelFrame step="checkout"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">YOUR POKOPIA SETUP</p><h1>{title}</h1><div className="focused-funnel__offer-heading"><strong>${(totalCents / 100).toFixed(2)}</strong>{regularPriceCents && <p>Regular: ${(regularPriceCents / 100).toFixed(2)}</p>}</div>{includes?.length ? <ul className="focused-funnel__benefits">{includes.map((item) => <li key={item}>Includes: {item}</li>)}</ul> : null}<p className="focused-funnel__lede">TOTAL: ${(totalCents / 100).toFixed(2)}</p><div className="focused-funnel__actions"><button className="action-link action-link--primary" type="button" disabled={loading} onClick={checkout}>{loading ? "CONNECTING TO STRIPE…" : "CONTINUE TO SECURE CHECKOUT"}</button></div>{status && <p className="focused-funnel__status" role="alert">{status}</p>}</div></section></FunnelFrame>;
}
