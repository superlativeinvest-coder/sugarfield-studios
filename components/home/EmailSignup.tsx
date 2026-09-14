"use client";

import { FormEvent, useState } from "react";

export function EmailSignup({ id = "email", buttonLabel = "Join updates", note = "No spam. Just new products, useful gaming tools, and occasional studio updates.", onSubmitResult }: { id?: string; buttonLabel?: string; note?: string; onSubmitResult?: (subscribed: boolean) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setIsLoading(true); setStatus(null); const form = new FormData(event.currentTarget); try { const response = await fetch("/api/email-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) }); const result: { error?: string; subscribed?: boolean } = await response.json(); const subscribed = response.ok && result.subscribed === true; onSubmitResult?.(subscribed); setStatus(subscribed ? "You’re on the list." : result.error ?? "Signup is unavailable right now."); } catch { onSubmitResult?.(false); setStatus("Signup is unavailable right now. Please try again later."); } finally { setIsLoading(false); } }
  return <form className="signup-form" onSubmit={handleSubmit}><label htmlFor={id}>Email address</label><div className="signup-form__row"><input id={id} name="email" type="email" autoComplete="email" placeholder="you@example.com" required /><button type="submit" disabled={isLoading}>{isLoading ? "Sending…" : buttonLabel}</button></div><p className="signup-form__note">{note}</p>{status && <p className="signup-form__status" role="status">{status}</p>}</form>;
}
