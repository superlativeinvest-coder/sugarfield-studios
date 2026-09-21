"use client";

import { useState } from "react";
import { getProductName } from "@/lib/delivery/product-labels";

type Download = { name: string; url: string };

export function DownloadButton({ orderId, productId }: { orderId: string; productId: string }) {
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function prepareDownloads() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/downloads/${encodeURIComponent(productId)}`, { credentials: "same-origin" });
      const data = await response.json() as { downloads?: Download[]; url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Downloads could not be prepared.");
      const prepared = data.downloads ?? (data.url ? [{ name: getProductName(productId), url: data.url }] : []);
      if (prepared.length === 0) throw new Error("No downloadable files were returned for this product.");
      setDownloads(prepared);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Downloads could not be prepared.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="customer-downloads"><button className="action-link action-link--primary" type="button" onClick={prepareDownloads} disabled={loading}>{loading ? "Preparing downloads…" : downloads.length > 0 ? "Refresh download links" : "Get downloads"}</button>{error && <p className="form-message form-message--error" role="alert">{error}</p>}{downloads.length > 0 && <div className="download-list" aria-label={`${getProductName(productId)} downloads`}>{downloads.map((download) => <a className="download-link" href={download.url} key={download.url} target="_blank" rel="noreferrer">Download {download.name}</a>)}</div>}</div>;
}
