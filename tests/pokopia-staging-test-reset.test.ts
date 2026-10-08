import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "@/app/api/pokopia/funnel/test-reset/route";

test("staging journey reset is unavailable unless the explicit local test flag and staging checkout are enabled", async () => {
  const originalTest = process.env.NEXT_PUBLIC_STAGING_AUTH_TEST;
  const originalCheckout = process.env.POKOPIA_CUMULATIVE_CHECKOUT_ENABLED;
  const originalUrl = process.env.SUPABASE_URL;
  const originalStripe = process.env.STRIPE_SECRET_KEY;
  try {
    process.env.NEXT_PUBLIC_STAGING_AUTH_TEST = "";
    const disabled = await GET();
    assert.equal(disabled.status, 404);
  } finally {
    process.env.NEXT_PUBLIC_STAGING_AUTH_TEST = originalTest;
    process.env.POKOPIA_CUMULATIVE_CHECKOUT_ENABLED = originalCheckout;
    process.env.SUPABASE_URL = originalUrl;
    process.env.STRIPE_SECRET_KEY = originalStripe;
  }
});
