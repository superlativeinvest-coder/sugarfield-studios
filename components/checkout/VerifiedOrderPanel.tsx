"use client";
import Link from "next/link";
import { DownloadButton } from "@/components/customer/DownloadButton";
import { getProductName } from "@/lib/delivery/product-labels";

type OrderSummary = { id: string; productId: string; fulfillmentStatus: "pending" | "fulfilled" | "failed"; entitlements: { productId: string }[] };

export function VerifiedOrderPanel({ order, sessionId }: { order: OrderSummary | null; sessionId: string }) {
  if (!sessionId) return <div className="checkout-status-card"><h2>Payment session missing</h2><p>Return to the Daily Reset page and start checkout again.</p><a className="action-link action-link--primary" href="/pokopia/daily-reset">Return to Daily Reset</a></div>;
  if (!order) return <div className="checkout-status-card"><h2>Payment verification is still processing</h2><p>Refresh this page after a moment. Downloads stay hidden until Supabase contains the verified Stripe order.</p><button className="action-link action-link--primary" type="button" onClick={() => window.location.reload()}>Refresh status</button></div>;
  const uniqueEntitlements = order.entitlements.filter((entitlement, index, all) => all.findIndex((candidate) => candidate.productId === entitlement.productId) === index);
  const products = uniqueEntitlements.length ? uniqueEntitlements : [{ productId: order.productId }];
  return <div className="checkout-status-card"><p className="eyebrow">Verified order</p><h2>Your downloads are ready</h2><p>Your Stripe checkout is verified. Generate fresh, time-limited links for each included product.</p><div className="customer-library-grid" aria-label="Verified product downloads">{products.map((entitlement) => <article className="checkout-status-card" key={entitlement.productId}><h3>{getProductName(entitlement.productId)}</h3><DownloadButton orderId={order.id} productId={entitlement.productId} /></article>)}</div><div className="focused-funnel__actions"><Link className="action-link action-link--secondary checkout-next-link" href={`/orders/${encodeURIComponent(order.id)}`}>VIEW THIS ORDER</Link><Link className="action-link action-link--secondary checkout-next-link" href="/library">MY LIBRARY</Link></div></div>;
}
