import test from "node:test";
import assert from "node:assert/strict";
import { isVerifiedCompanionBuyer, isVerifiedDailyResetBuyer, isVerifiedMiniToolBuyer, qualifiesForCompanionUpgrade, qualifiesForDailyResetUpgrade } from "@/lib/orders/qualification";
import { getCheckoutProduct, isCompanionUpgradeRequest, isCompletePlayerSystemRequest, isCompletionistUpgradeRequest, isMiniToolUpgradeRequest, validateCheckoutRequest } from "@/lib/commerce/checkout";
import { getProductFilePaths, P16_LEGACY_FULFILLMENT_VERSION, P16_V2_FULFILLMENT_VERSION } from "@/lib/delivery/service";
import { isOfferCheckoutReady, pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { getProductBySlug } from "@/lib/catalog/data";
import { createOrderIdempotently } from "@/lib/orders/idempotency";
import type { Order } from "@/lib/orders/types";

const paidOrder: Order = { id: "order-1", provider: "stripe", providerSessionId: "cs_test_1", productId: "P06", status: "paid", sku: "P06", fulfillmentStatus: "pending", entitlements: [{ productId: "P06", grantedAt: "2026-08-29T00:00:00.000Z" }], createdAt: "2026-08-29T00:00:00.000Z" };

test("verified Daily Reset order qualifies for future upgrade", () => { assert.equal(isVerifiedDailyResetBuyer(paidOrder), true); });
test("missing, unpaid, or mismatched orders do not qualify", () => {
  assert.equal(isVerifiedDailyResetBuyer(null), false);
  assert.equal(isVerifiedDailyResetBuyer({ ...paidOrder, status: "paid", productId: "P01" }), false);
  assert.equal(isVerifiedDailyResetBuyer({ ...paidOrder, entitlements: [] }), false);
});
test("Companion qualification uses only the verified Daily Reset order repository", async () => {
  const repository = { findById: async (id: string) => id === "order-1" ? paidOrder : null, findByFunnelSession: async () => paidOrder } as never;
  assert.equal(await qualifiesForDailyResetUpgrade(repository, { orderId: "order-1" }), true);
  assert.equal(await qualifiesForDailyResetUpgrade(repository, { orderId: "missing" }), false);
});
test("Mini Tool checkout contract remains available outside the migrated funnel", () => {
  const valid = validateCheckoutRequest({ productId: "P13", sku: "P13", offerId: "pokopia_mini_tool", upgrade: true, funnelId: "pokopia_daily_reset", funnelStep: "mini_tool", funnelSession: "session-1", sourceOrderId: "order-1", attribution: { firstTouch: { utm_source: "test" }, currentTouch: { utm_campaign: "upgrade" } } });
  assert.ok(valid && isMiniToolUpgradeRequest(valid));
  assert.equal(isMiniToolUpgradeRequest({ ...valid!, upgrade: false }), false);
  assert.equal(isMiniToolUpgradeRequest({ ...valid!, sourceOrderId: undefined }), false);
});
test("Companion qualification requires a paid P06 order and matching entitlement", async () => {
  const p13: Order = { ...paidOrder, id: "order-p13", productId: "P13", sku: "P13", entitlements: [{ productId: "P13", grantedAt: paidOrder.createdAt }] };
  const repository = { findById: async (id: string) => id === "order-1" ? paidOrder : id === "order-p13" ? p13 : null, findByFunnelSession: async () => paidOrder } as never;
  assert.equal(isVerifiedMiniToolBuyer(p13), true);
  assert.equal(isVerifiedMiniToolBuyer({ ...p13, entitlements: [] }), false);
  assert.equal(isVerifiedMiniToolBuyer({ ...p13, productId: "P06" }), false);
  assert.equal(await qualifiesForCompanionUpgrade(repository, { orderId: "order-1" }), true);
  assert.equal(await qualifiesForCompanionUpgrade(repository, { orderId: "order-p13" }), false);
  assert.equal(await qualifiesForCompanionUpgrade(repository, { orderId: "missing" }), false);
});
test("Companion checkout contract permits a direct P16 purchase after either Daily Reset decision", () => {
  const request = validateCheckoutRequest({ productId: "P16", sku: "P16", offerId: "pokopia_companion", upgrade: false, funnelStep: "companion" });
  assert.ok(request && isCompanionUpgradeRequest(request));
  assert.equal(pokopiaFunnelOffers.companion.catalogProductId, "P16");
  assert.equal(pokopiaFunnelOffers.companion.funnelPrice, 19.99);
  assert.equal(isCompanionUpgradeRequest({ ...request!, sku: "pokopia_adventure_companion" }), true);
});
test("Mini Tool configuration and secure delivery map are canonical", () => {
  assert.equal(pokopiaFunnelOffers.miniTool.catalogProductId, "P13");
  assert.equal(pokopiaFunnelOffers.miniTool.productSku, "P13");
  assert.equal(pokopiaFunnelOffers.miniTool.funnelPrice, 3.99);
  assert.deepEqual(getProductFilePaths("P13"), [
    "pokopia/mini-tool/v3-page2-shell-20260908/Pokopia-Event-Tracker-A4.pdf",
    "pokopia/mini-tool/v3-page2-shell-20260908/Pokopia-Event-Tracker-US-Letter.pdf",
  ]);
  assert.deepEqual(getProductFilePaths("P06"), ["pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf", "pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf"]);
  assert.deepEqual(getProductFilePaths("P01"), []);
  assert.deepEqual(getProductFilePaths("pokopia_companion"), []);
});
test("Companion P16 configuration and secure delivery map are canonical", () => {
  assert.equal(pokopiaFunnelOffers.companion.catalogProductId, "P16");
  assert.equal(pokopiaFunnelOffers.companion.productSku, "pokopia_adventure_companion");
  assert.equal(pokopiaFunnelOffers.companion.funnelPrice, 19.99);
  assert.equal(pokopiaFunnelOffers.companion.cta, "ADD THE ADVENTURE COMPANION — $19.99");
  assert.equal(pokopiaFunnelOffers.companion.benefits.includes("Daily Reset System"), false);
  assert.deepEqual(pokopiaFunnelOffers.companion.benefits, ["Track events and rare finds", "Plan Cloud Island builds", "Organize exploration progress", "Keep field-guide references together", "Use one Adventure Dashboard"]);
  assert.equal(pokopiaFunnelOffers.companion.includedProducts.length, 6);
  assert.equal(getProductBySlug("pokopia-adventure-companion")?.delivery?.fileCount, 12);
  assert.deepEqual(getProductFilePaths("P16", P16_LEGACY_FULFILLMENT_VERSION), [
    "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf",
    "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf",
    "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf",
    "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf",
  ]);
  assert.equal(getProductFilePaths("P16", P16_V2_FULFILLMENT_VERSION).length, 12);
});
test("P13 order metadata retains the verified P06 source order", async () => {
  const input = { provider: "stripe" as const, providerSessionId: "cs_test_p13", providerEventId: "evt_test_p13", paymentIntentId: "pi_test_p13", productId: "P13", offerId: "pokopia_mini_tool", sourceOrderId: "11111111-1111-4111-8111-111111111111", sku: "P13", status: "paid" as const, amountTotal: 399, currency: "usd", funnelId: "pokopia_daily_reset", funnelStep: "mini_tool", funnelSession: "session-p13", firstTouchAttribution: { utm_source: "test" }, currentTouchAttribution: { utm_campaign: "upgrade" }, createdAt: "2026-08-29T00:00:00.000Z", entitlements: [{ productId: "P13", grantedAt: "2026-08-29T00:00:00.000Z" }] };
  let creates = 0;
  const createPaidOrder = async (value: typeof input) => { creates += 1; return { id: "order-p13", ...value, fulfillmentStatus: "pending" as const }; };
  const repository = {
    findByProviderSessionId: async () => null,
    createPaidOrder,
  } as never;
  const first = await createOrderIdempotently(repository, input);
  const replayRepository = { findByProviderSessionId: async () => first.order, createPaidOrder } as never;
  const replay = await createOrderIdempotently(replayRepository, input);
  assert.equal(first.order.sourceOrderId, input.sourceOrderId);
  assert.equal(first.order.entitlements[0]?.productId, "P13");
  assert.equal(replay.created, false);
  assert.equal(creates, 1);
});
test("P16 order metadata points directly to the verified P06 source order", async () => {
  const input = { provider: "stripe" as const, providerSessionId: "cs_test_p16", providerEventId: "evt_test_p16", paymentIntentId: "pi_test_p16", productId: "P16", offerId: "pokopia_companion", sourceOrderId: "22222222-2222-4222-8222-222222222222", sku: "P16", status: "paid" as const, amountTotal: 1999, currency: "usd", funnelId: "pokopia_daily_reset", funnelStep: "companion", funnelSession: "session-p16", firstTouchAttribution: { utm_source: "test" }, currentTouchAttribution: { utm_campaign: "companion" }, createdAt: "2026-08-29T00:00:00.000Z", entitlements: [{ productId: "P16", grantedAt: "2026-08-29T00:00:00.000Z" }] };
  let creates = 0;
  const repository = { findByProviderSessionId: async () => null, createPaidOrder: async (value: typeof input) => { creates += 1; return { id: "order-p16", ...value, fulfillmentStatus: "pending" as const }; } } as never;
  const result = await createOrderIdempotently(repository, input);
  assert.equal(result.order.productId, "P16");
  assert.equal(result.order.sourceOrderId, input.sourceOrderId);
  assert.equal(result.order.entitlements.some((entitlement) => entitlement.productId === "P16"), true);
  assert.equal(result.order.entitlements.some((entitlement) => entitlement.productId === "P13"), false);
  assert.equal(creates, 1);
});
test("Completionist qualification requires a paid P16 order and matching entitlement", () => {
  const p16: Order = { ...paidOrder, id: "order-p16", productId: "P16", sku: "P16", entitlements: [{ productId: "P16", grantedAt: paidOrder.createdAt }] };
  assert.equal(isVerifiedCompanionBuyer(p16), true);
  assert.equal(isVerifiedCompanionBuyer({ ...p16, status: "pending" as never }), false);
  assert.equal(isVerifiedCompanionBuyer({ ...p16, entitlements: [] }), false);
  assert.equal(isVerifiedCompanionBuyer({ ...p16, productId: "P13" }), false);
});
test("P17 is a $14.99 P18-skip downsell and P18 keeps its verified-source contract", () => {
  const request = validateCheckoutRequest({ productId: "P17", sku: "P17", offerId: "pokopia_completionist_kit", upgrade: false, funnelId: "pokopia_daily_reset", funnelStep: "completionist-kit" });
  assert.equal(request?.productId, "P17");
  assert.equal(Boolean(request && isCompletionistUpgradeRequest(request)), true);
  assert.equal(pokopiaFunnelOffers.completionistKit.catalogProductId, "P17");
  assert.equal(pokopiaFunnelOffers.completionistKit.enabled, true);
  assert.equal(pokopiaFunnelOffers.completionistKit.funnelPrice, 14.99);
  assert.equal(pokopiaFunnelOffers.completionistKit.description.includes("README"), false);
  const p18 = validateCheckoutRequest({ productId: "P18", sku: "pokopia_complete_player_system", offerId: "pokopia_complete_player_system", upgrade: true, funnelStep: "complete-player-system", sourceOrderId: "11111111-1111-4111-8111-111111111111" });
  assert.equal(Boolean(p18 && isCompletePlayerSystemRequest(p18)), true);
  assert.equal(isOfferCheckoutReady(pokopiaFunnelOffers.completePlayerSystem), false);
  assert.equal(getCheckoutProduct("P18"), undefined);
  assert.equal(pokopiaFunnelOffers.completePlayerSystem.benefits.includes("22 PDFs: US Letter and A4 versions of every component"), true);
});
