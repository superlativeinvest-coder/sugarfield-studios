import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  // Never let a local preview create real charges by accident. Stripe Checkout
  // inherits the mode from the secret key, so a live key would produce the
  // exact "live mode, known test card" error shown in the preview.
  if (process.env.NODE_ENV !== "production" && secretKey?.startsWith("sk_live_")) {
    console.error("Stripe live mode is disabled in local development. Use an sk_test_ key in .env.local.");
    stripeClient = null;
  } else {
    stripeClient = secretKey ? new Stripe(secretKey) : null;
  }
  return stripeClient;
}
