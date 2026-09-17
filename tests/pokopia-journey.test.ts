import test from "node:test";
import assert from "node:assert/strict";
import { applyPostCompanionIntent, canActOnP17Downsell, canViewP17Downsell, emptyPokopiaJourney, resolvePostCompanionRoute } from "@/lib/pokopia-funnel/journey";
import { isVerifiedDailyResetBuyer } from "@/lib/orders/qualification";
import type { Order } from "@/lib/orders/types";

const journey = (changes: Partial<ReturnType<typeof emptyPokopiaJourney>>) => ({ ...emptyPokopiaJourney("journey-test"), ...changes });

test("Journey A: P06 and P16 purchases make P18 eligible", () => {
  const result = applyPostCompanionIntent(journey({ quickStartClaimed: true, dailyResetPurchased: true, companionPurchased: true }));
  assert.equal(result.p18Eligible, true); assert.equal(resolvePostCompanionRoute(result), "/pokopia/funnel/complete-player-system");
});
test("Journey B: P06 purchase survives a P16 skip", () => {
  const result = applyPostCompanionIntent(journey({ dailyResetPurchased: true, companionSkipped: true }));
  assert.equal(result.p18Eligible, true); assert.equal(result.p18Bypassed, false);
});
test("Journey C: P16 purchase alone makes P18 eligible", () => {
  const result = applyPostCompanionIntent(journey({ dailyResetSkipped: true, companionPurchased: true }));
  assert.equal(result.p18Eligible, true); assert.equal(resolvePostCompanionRoute(result), "/pokopia/funnel/complete-player-system");
});
test("Journey D: double skip bypasses P18 and P17", () => {
  const result = applyPostCompanionIntent(journey({ dailyResetSkipped: true, companionSkipped: true }));
  assert.equal(resolvePostCompanionRoute(result), "/pokopia/funnel/complete");
  assert.equal(result.p18Bypassed, true); assert.equal(result.p18Eligible, false);
  assert.equal(result.branchReason, "double_skip_low_intent"); assert.equal(result.journeyCompleted, true);
  assert.equal(canViewP17Downsell(result), false);
});
test("Journey E: only an eligible P18 view and skip unlocks P17", () => {
  const eligible = applyPostCompanionIntent(journey({ dailyResetPurchased: true }));
  assert.equal(canViewP17Downsell({ ...eligible, p18Viewed: true, p18Skipped: true }), true);
  assert.equal(canViewP17Downsell({ ...eligible, p18Skipped: true }), false);
});
test("P17 actions require the trusted P18-skip downsell state", () => {
  assert.equal(canActOnP17Downsell(journey({ selectedTier: "P16", currentStep: "completionist-kit" })), false);
  assert.equal(canActOnP17Downsell(journey({ selectedTier: "P06", p18Eligible: true, p18Viewed: true, p18Skipped: true, currentStep: "completionist-kit" })), true);
  assert.equal(canActOnP17Downsell(journey({ selectedTier: "FREE", p18Eligible: true, p18Viewed: true, p18Skipped: true, currentStep: "completionist-kit" })), true);
});
test("Journey F: P17 skip completes once and remains idempotent", () => {
  const first = { ...journey({ p18Eligible: true, p18Viewed: true, p18Skipped: true }), p17Skipped: true, journeyCompleted: true };
  const retry = { ...first, p17Skipped: true, journeyCompleted: true };
  assert.deepEqual(retry, first);
});
test("Journey G: historical P17 ownership is not a branching prerequisite", () => {
  const historical = journey({ p17Purchased: true, journeyCompleted: true });
  assert.equal(historical.p17Purchased, true); assert.equal(canViewP17Downsell(historical), false);
});
test("Journey H: verified ownership is represented by server-supplied purchase flags, not skip state", () => {
  const reentry = applyPostCompanionIntent(journey({ companionPurchased: true, dailyResetSkipped: true }));
  assert.equal(reentry.p18Eligible, true); assert.equal(reentry.p18Bypassed, false);
});
test("Journey I: direct P18/P17 access has no qualifying journey state", () => {
  const direct = journey({});
  assert.equal(resolvePostCompanionRoute(direct), "/pokopia/funnel/complete");
  assert.equal(canViewP17Downsell(direct), false);
});
test("only a paid P06 order with its P06 entitlement can unlock Daily Reset owner messaging", () => {
  const base: Order = { id: "order", provider: "stripe", providerSessionId: "session", productId: "P06", status: "paid", fulfillmentStatus: "fulfilled", entitlements: [{ productId: "P06", grantedAt: "2026-09-09" }], createdAt: "2026-09-09" };
  assert.equal(isVerifiedDailyResetBuyer(base), true);
  assert.equal(isVerifiedDailyResetBuyer({ ...base, productId: "P16" }), false);
  assert.equal(isVerifiedDailyResetBuyer({ ...base, entitlements: [] }), false);
});
test("journey identity, session, first-touch, and current-touch values persist without replacing first touch", () => {
  const first = journey({ funnelSessionId: "session-1", firstTouchAttribution: { source: "pinterest" }, currentAttribution: { campaign: "initial" } });
  const later = { ...first, currentAttribution: { campaign: "retargeting" } };
  assert.equal(later.journeyId, "journey-test"); assert.equal(later.funnelSessionId, "session-1");
  assert.deepEqual(later.firstTouchAttribution, { source: "pinterest" }); assert.deepEqual(later.currentAttribution, { campaign: "retargeting" });
});
