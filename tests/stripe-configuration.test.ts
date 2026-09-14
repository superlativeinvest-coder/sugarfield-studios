import test from "node:test";
import assert from "node:assert/strict";

test("Daily Reset uses the Stripe price that matches the active key mode", async () => {
  const originalSecretKey = process.env.STRIPE_SECRET_KEY;
  const originalTestPrice = process.env.STRIPE_DAILY_RESET_PRICE_ID;
  const originalLivePrice = process.env.STRIPE_LIVE_DAILY_RESET_PRICE_ID;
  const originalTestWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  const originalLiveWebhook = process.env.STRIPE_LIVE_WEBHOOK_SECRET;
  const originalTestP18Price = process.env.STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID;
  const originalLiveP18Price = process.env.STRIPE_P18_LIVE_PRICE_ID;

  try {
    process.env.STRIPE_DAILY_RESET_PRICE_ID = "price_test";
    process.env.STRIPE_LIVE_DAILY_RESET_PRICE_ID = "price_live";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = "whsec_live";
    process.env.STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID = "price_p18_test";
    process.env.STRIPE_P18_LIVE_PRICE_ID = "price_p18_live";
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    const configuration = await import("@/lib/stripe/configuration");
    assert.equal(configuration.getDailyResetStripePriceId(), "price_test");
    assert.equal(configuration.getStripeWebhookSecret(), "whsec_test");
    assert.equal(configuration.getCanonicalP18StripePriceId(), "price_p18_test");

    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    assert.equal(configuration.getDailyResetStripePriceId(), "price_live");
    assert.equal(configuration.getStripeWebhookSecret(), "whsec_live");
    assert.equal(configuration.getCanonicalP18StripePriceId(), "price_p18_live");
  } finally {
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
    process.env.STRIPE_DAILY_RESET_PRICE_ID = originalTestPrice;
    process.env.STRIPE_LIVE_DAILY_RESET_PRICE_ID = originalLivePrice;
    process.env.STRIPE_WEBHOOK_SECRET = originalTestWebhook;
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = originalLiveWebhook;
    process.env.STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID = originalTestP18Price;
    process.env.STRIPE_P18_LIVE_PRICE_ID = originalLiveP18Price;
  }
});
