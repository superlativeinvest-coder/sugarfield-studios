function isLiveStripeMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
}

export function isStripeSandboxMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;
}

export function getDailyResetStripePriceId(): string | undefined {
  return isLiveStripeMode()
    ? process.env.STRIPE_LIVE_DAILY_RESET_PRICE_ID ?? process.env.STRIPE_DAILY_RESET_PRICE_ID
    : process.env.STRIPE_DAILY_RESET_PRICE_ID;
}

// The Quick Start Pack is intentionally Sandbox-only until a separate live
// promotion is approved. Do not add a live fallback here.
export function getQuickStartStripePriceId(): string | undefined {
  return isStripeSandboxMode() ? process.env.STRIPE_QUICK_START_PRICE_ID : undefined;
}

export function getStripeWebhookSecret(): string | undefined {
  return isLiveStripeMode()
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;
}

// Keep live and Sandbox P18 prices strictly separated.  A live server must
// have an explicit live Price; Sandbox uses its own canonical test Price.
export function getCanonicalP18StripePriceId(): string | undefined {
  return isLiveStripeMode()
    ? process.env.STRIPE_P18_LIVE_PRICE_ID
    : process.env.STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID;
}
