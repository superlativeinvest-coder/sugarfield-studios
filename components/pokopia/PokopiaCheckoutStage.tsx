"use client";

import { useState } from "react";
import type { CanonicalLineItem } from "@/lib/pokopia-funnel/cumulative";
import { FunnelFrame, useCanonicalFunnelTracking, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";

export function PokopiaCheckoutStage({ items, showFreePack }: { items: CanonicalLineItem[]; showFreePack: boolean }) {
  const track = useFunnelTracking(); const trackCanonical = useCanonicalFunnelTracking(); const [status, setStatus] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const totalCents = items.reduce((total, item) => total + item.unitAmount, 0);
  async function checkout() { setLoading(true); setStatus(null); try { const response = await fetch("/api/pokopia/funnel/checkout", { method: "POST" }); const result = await response.json() as { checkoutUrl?: string; error?: string }; if (!response.ok || !result.checkoutUrl) { setStatus(result.error ?? "Checkout is unavailable right now."); return; } track("pokopia_funnel_checkout_started", totalCents / 100); trackCanonical("checkout_started", { funnelStep: "checkout", productId: items[0]?.productId, selectedProducts: items.map((item) => item.productId), cartValueCents: totalCents }); window.location.assign(result.checkoutUrl); } catch { setStatus("Checkout is unavailable right now."); } finally { setLoading(false); } }
  return <FunnelFrame step="checkout"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">YOUR POKOPIA ORDER</p><h1>READY FOR CHECKOUT</h1><ul className="focused-funnel__benefits" aria-label="Selected products">{showFreePack && <li><span>Free Quick Start Pack</span><strong>$0.00</strong></li>}{items.map((item) => <li key={item.productId}><span>{item.title}</span><strong>${(item.unitAmount / 100).toFixed(2)}</strong></li>)}</ul><p className="focused-funnel__lede">TOTAL: ${(totalCents / 100).toFixed(2)}</p><div className="focused-funnel__actions"><button className="action-link action-link--primary" type="button" disabled={loading} onClick={checkout}>{loading ? "CONNECTING TO STRIPE…" : "CONTINUE TO SECURE CHECKOUT"}</button></div>{status && <p className="focused-funnel__status" role="alert">{status}</p>}</div></section></FunnelFrame>;
}
