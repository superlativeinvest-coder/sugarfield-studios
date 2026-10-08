import type Stripe from "stripe";

type StripeWebhookVerifier = Pick<Stripe.Webhooks, "constructEvent">;

export function constructStripeEventWithSecrets(verifier: StripeWebhookVerifier, payload: string | Buffer, signature: string, secrets: readonly string[]): Stripe.Event | null {
  for (const secret of secrets) {
    try { return verifier.constructEvent(payload, signature, secret); }
    catch { /* Continue through the rotation set without weakening validation. */ }
  }
  return null;
}
