"use client";

import { FormEvent, useState } from "react";

export default function ReleaseAccessPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/release-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: form.get("token") }) });
    const result = await response.json() as { nextRoute?: string; error?: string };
    if (response.ok && result.nextRoute) { window.location.assign(result.nextRoute); return; }
    setError(result.error ?? "Release access could not be verified.");
    setLoading(false);
  }
  return <main className="focused-funnel"><section className="focused-funnel__panel"><p className="eyebrow">RESTRICTED RELEASE VALIDATION</p><h1>Enter the release token</h1><p>This deployment is available only to approved production validators.</p><form onSubmit={submit}><label htmlFor="release-token">Release token</label><input id="release-token" name="token" type="password" autoComplete="off" required minLength={16} /><button type="submit" disabled={loading}>{loading ? "VERIFYING…" : "CONTINUE"}</button></form>{error && <p role="alert">{error}</p>}</section></main>;
}
