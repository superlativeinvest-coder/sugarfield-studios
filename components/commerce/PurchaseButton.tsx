"use client";

import { useState } from "react";

export function PurchaseButton({ productId }: { productId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    setIsLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const data: { checkoutUrl?: string; error?: string } = await response.json();
      if (!response.ok || !data.checkoutUrl) { setStatus(data.error ?? "Checkout is unavailable right now."); return; }
      window.location.assign(data.checkoutUrl);
    } catch { setStatus("Checkout is unavailable right now. Please try again later."); }
    finally { setIsLoading(false); }
  }

  return <div className="purchase-action"><button className="action-link action-link--primary" type="button" onClick={startCheckout} disabled={isLoading}>{isLoading ? "Connecting to checkout…" : "Continue to secure checkout"}</button>{status && <p className="purchase-action__status" role="status">{status}</p>}</div>;
}
