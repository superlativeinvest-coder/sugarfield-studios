import test from "node:test";
import assert from "node:assert/strict";
import { getStripeWebhookSecrets } from "@/lib/stripe/configuration";
import Stripe from "stripe";
import { constructStripeEventWithSecrets } from "@/lib/stripe/webhook-signature";

test("webhook secret rotation accepts established and temporary secrets without duplicates", () => {
  assert.deepEqual(getStripeWebhookSecrets({ STRIPE_SECRET_KEY: "sk_live_x", STRIPE_LIVE_WEBHOOK_SECRET: "whsec_public", STRIPE_WEBHOOK_SECRET: "whsec_legacy", STRIPE_WEBHOOK_SECRETS: "whsec_validation, whsec_public" }), ["whsec_public", "whsec_legacy", "whsec_validation"]);
  assert.deepEqual(getStripeWebhookSecrets({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test" }), ["whsec_test"]);
});

test("webhook verification accepts either configured secret and rejects invalid signatures", () => {
  const stripe = new Stripe("sk_test_placeholder");
  const payload = JSON.stringify({ id: "evt_test", object: "event", type: "checkout.session.completed", data: { object: {} } });
  const validationSignature = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_validation" });
  assert.equal(constructStripeEventWithSecrets(stripe.webhooks, payload, validationSignature, ["whsec_public", "whsec_validation"])?.id, "evt_test");
  assert.equal(constructStripeEventWithSecrets(stripe.webhooks, payload, validationSignature, ["whsec_public"]), null);
});
