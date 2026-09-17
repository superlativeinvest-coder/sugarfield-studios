import test from "node:test";
import assert from "node:assert/strict";
import { isCumulativeCheckoutEnabledForEnvironment } from "@/lib/pokopia-funnel/cumulative";

test("cumulative checkout is staging-only and requires a Stripe test key", () => {
  const base = { POKOPIA_CUMULATIVE_CHECKOUT_ENABLED: "true", SUPABASE_URL: "https://faxsnbdjzniwyhtnsvfz.supabase.co", STRIPE_SECRET_KEY: "sk_test_example" };
  assert.equal(isCumulativeCheckoutEnabledForEnvironment({ ...base, SUPABASE_URL: "https://lbbxdvszykxdaytqmqnl.supabase.co" }), false);
  assert.equal(isCumulativeCheckoutEnabledForEnvironment({ ...base, STRIPE_SECRET_KEY: "sk_live_example" }), false);
  assert.equal(isCumulativeCheckoutEnabledForEnvironment(base), true);
});
