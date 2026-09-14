"use client";

import { useState } from "react";

type OrderSummary = { id: string; productId: string; fulfillmentStatus: "pending" | "fulfilled" | "failed" };

export function VerifiedOrderPanel({ order, sessionId }: { order: OrderSummary | null; sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState<{ name: string; url: string }[]>([]);

  if (!sessionId) return <div className="checkout-status-card"><h2>Payment session missing</h2><p>Return to the Daily Reset page and start checkout again.</p><a className="action-link action-link--primary" href="/pokopia/funnel/daily-reset">Return to Daily Reset</a></div>;
  if (!order) return <div className="checkout-status-card"><h2>Payment verification is still processing</h2><p>Refresh this page after a moment. Downloads stay hidden until Supabase contains the verified Stripe order.</p><button className="action-link action-link--primary" type="button" onClick={() => window.location.reload()}>Refresh status</button></div>;
  const verifiedOrder = order;

  async function prepareDownloads() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(verifiedOrder.id)}/downloads/${encodeURIComponent(verifiedOrder.productId)}`);
      const data = await response.json() as { downloads?: { name: string; url: string }[]; url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Downloads could not be prepared.");
      setDownloads(data.downloads ?? (data.url ? [{ name: verifiedOrder.productId === "P13" ? "Pokopia Event Tracker" : verifiedOrder.productId === "P16" ? "Pokopia Adventure Companion" : verifiedOrder.productId === "P17" ? "Pokopia Completionist Kit" : verifiedOrder.productId === "P18" ? "Pokopia Complete Player System" : "Pokopia Daily Reset Checklist", url: data.url }] : []));
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "Downloads could not be prepared."); }
    finally { setLoading(false); }
  }

  const productName = verifiedOrder.productId === "P13" ? "Pokopia Event Tracker" : verifiedOrder.productId === "P16" ? "Pokopia Adventure Companion" : verifiedOrder.productId === "P17" ? "Pokopia Completionist Kit" : verifiedOrder.productId === "P18" ? "Pokopia Complete Player System" : "Pokopia Daily Reset Checklist";
  return <div className="checkout-status-card"><p className="eyebrow">Verified order</p><h2>{productName}</h2><p>Your Stripe payment is verified. Download links expire after one hour for security.</p><button className="action-link action-link--primary" type="button" onClick={prepareDownloads} disabled={loading}>{loading ? "Preparing downloads…" : "Get my downloads"}</button>{error && <p className="form-message form-message--error" role="alert">{error}</p>}{downloads.length > 0 && <div className="download-list" aria-label="Your downloads">{downloads.map((download) => <a className="download-link" href={download.url} key={download.url} target="_blank" rel="noreferrer">Download {download.name}</a>)}</div>}{verifiedOrder.productId === "P06" && <a className="action-link action-link--secondary checkout-next-link" href={`/pokopia/funnel/companion?order_id=${encodeURIComponent(verifiedOrder.id)}`}>Continue to the Adventure Companion</a>}{verifiedOrder.productId === "P16" && <a className="action-link action-link--secondary checkout-next-link" href={`/pokopia/funnel/complete-player-system?order_id=${encodeURIComponent(verifiedOrder.id)}`}>Continue to the Complete Player System</a>}{verifiedOrder.productId === "P18" && <p className="focused-funnel__status">Your Complete Player System delivery is ready.</p>}</div>;
}
