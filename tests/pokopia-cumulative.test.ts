import test from "node:test";
import assert from "node:assert/strict";
import { checkoutFingerprintMatches, clearCheckout, getP18Readiness, getTier, getUpgradeDeltaCents, restorePriorTier, selectTier, stripeSessionMatchesFingerprint } from "@/lib/pokopia-funnel/cumulative";
import { emptyPokopiaJourney } from "@/lib/pokopia-funnel/journey";

test("cumulative prices are final tier totals and display only the approved upgrades", () => {
  assert.equal(getTier("P06").totalCents, 499);
  assert.equal(getTier("P16").totalCents, 1999);
  assert.equal(getTier("P18").totalCents, 2499);
  assert.equal(getUpgradeDeltaCents("P06", "P16"), 1500);
  assert.equal(getUpgradeDeltaCents("P16", "P18"), 500);
  assert.equal(getUpgradeDeltaCents("P06", "P18"), 2000);
});

test("P17 deterministically replaces and restores the prior paid tier", () => {
  const p16 = selectTier(emptyPokopiaJourney("journey"), "P16");
  const p17 = selectTier({ ...p16, preP17Tier: "P16", p17Accepted: true }, "P17");
  assert.equal(p17.selectedTier, "P17"); assert.equal(p17.currentTotalCents, 1499);
  const restored = restorePriorTier({ ...p17, p17Skipped: true });
  assert.equal(restored.selectedTier, "P16"); assert.equal(restored.currentTotalCents, 1999);
  const p06 = restorePriorTier({ ...p17, preP17Tier: "P06", p17Skipped: true });
  assert.equal(p06.selectedTier, "P06"); assert.equal(p06.currentTotalCents, 499);
});

test("checkout reuse requires the exact final-tier fingerprint and is invalidated by selection changes", () => {
  const p16 = selectTier(emptyPokopiaJourney("journey"), "P16");
  const checkout = { ...p16, checkoutCreated: true, stripeCheckoutSessionId: "cs_open", checkoutTier: "P16" as const, checkoutPriceId: getTier("P16").stripePriceId, checkoutAmountCents: 1999 };
  assert.equal(checkoutFingerprintMatches(checkout, "P16"), true);
  assert.equal(checkoutFingerprintMatches(checkout, "P17"), false);
  const changed = selectTier(checkout, "P17");
  assert.equal(changed.stripeCheckoutSessionId, undefined);
  assert.equal(clearCheckout(checkout).checkoutCreated, false);
});

test("Stripe session reuse requires canonical metadata, amount, currency, and one line item", () => {
  const journey = { ...selectTier(emptyPokopiaJourney("journey"), "P16"), funnelSessionId: "funnel", checkoutCreated: true, stripeCheckoutSessionId: "cs_open", checkoutTier: "P16" as const, checkoutPriceId: getTier("P16").stripePriceId, checkoutAmountCents: 1999 };
  const price = { id: getTier("P16").stripePriceId, unit_amount: 1999, currency: "usd" };
  const candidate = { status: "open", currency: "usd", metadata: { journey_id: "journey", funnel_session_id: "funnel", selected_tier: "P16", stripe_price_id: getTier("P16").stripePriceId, canonical_total_cents: "1999" }, line_items: { data: [{ quantity: 1, price }] } };
  assert.equal(stripeSessionMatchesFingerprint(candidate as never, journey, "P16"), true);
  assert.equal(stripeSessionMatchesFingerprint({ ...candidate, metadata: { ...candidate.metadata, journey_id: "other" } } as never, journey, "P16"), false);
  assert.equal(stripeSessionMatchesFingerprint({ ...candidate, line_items: { data: [{ quantity: 1, price: { ...price, unit_amount: 499 } }] } } as never, journey, "P16"), false);
});

test("P18 stays blocked without both its explicit Price ID and approved delivery manifest", () => {
  assert.equal(getP18Readiness().ready, false);
});
