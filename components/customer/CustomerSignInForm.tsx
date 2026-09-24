"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type CustomerSignInFormProps = { nextPath: string; heading: string; intro: string; backHref: string; backLabel: string };

export function CustomerSignInForm({ nextPath, heading, intro, backHref, backLabel }: CustomerSignInFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending"); setMessage("");
    try {
      const response = await fetch("/api/auth/magic-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, next: nextPath }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not send your sign-in link.");
      setStatus("sent"); setMessage("Check your inbox for a secure sign-in link. Open it in this same browser to continue.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "We could not send your sign-in link."); }
  }

  return <main><section className="site-section auth-section"><div className="site-container auth-card"><p className="eyebrow">Customer access</p><h1>{heading}</h1><p className="section-intro">{intro}</p><form className="signup-form auth-form" onSubmit={submit}><label htmlFor="customer-email">Customer email</label><input id="customer-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "sending"} /><button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "SEND SIGN-IN LINK"}</button>{message ? <p className={status === "error" ? "auth-status auth-status--error" : "auth-status"} role="status">{message}</p> : null}</form><Link className="action-link action-link--secondary" href={backHref}>{backLabel}</Link></div></section></main>;
}
