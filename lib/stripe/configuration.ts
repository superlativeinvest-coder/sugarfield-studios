function isLiveStripeMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
}

export function getDailyResetStripePriceId(): string | undefined {
  return isLiveStripeMode()
    ? process.env.STRIPE_LIVE_DAILY_RESET_PRICE_ID ?? process.env.STRIPE_DAILY_RESET_PRICE_ID
    : process.env.STRIPE_DAILY_RESET_PRICE_ID;
}

export function getStripeWebhookSecret(): string | undefined {
  return isLiveStripeMode()
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;
}

// P18 may only use a Price created in the same live Stripe account as the
// server key. The historical test Price is deliberately never a fallback.
export function getLiveP18StripePriceId(): string | undefined {
  return isLiveStripeMode() ? process.env.STRIPE_P18_LIVE_PRICE_ID : undefined;
}
