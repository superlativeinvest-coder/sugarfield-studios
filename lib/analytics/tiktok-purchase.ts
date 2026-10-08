import { getProductName } from "@/lib/delivery/product-labels";
import { verifyAdvertisingConsentMetadata } from "@/lib/privacy/advertising-consent-server";
import type { Order } from "@/lib/orders/types";
import { stableOrderEventId } from "./server";
import { sendTikTokEvent, type TikTokPurchaseEvent, type TikTokSendResult } from "./tiktok-events-api";

export type TikTokPurchaseIntegrationResult = TikTokSendResult | { status: "skipped"; reason: string };

type TikTokPurchaseDependencies = {
  send?: (event: TikTokPurchaseEvent) => Promise<TikTokSendResult>;
  now?: Date;
};

function paidContents(order: Order): TikTokPurchaseEvent["contents"] {
  const lineItems = (order.lineItems ?? []).filter((item) => item.productId !== "FREE-QUICK-START" && item.quantity > 0 && Number.isSafeInteger(item.unitAmount) && item.unitAmount >= 0);
  if (lineItems.length) return lineItems.map((item) => ({ contentId: item.productId, contentName: getProductName(item.productId), quantity: item.quantity, priceCents: item.unitAmount }));
  if (order.productId === "FREE-QUICK-START" || !Number.isSafeInteger(order.amountTotal) || (order.amountTotal ?? 0) < 0) return [];
  return [{ contentId: order.productId, contentName: getProductName(order.productId), quantity: 1, priceCents: order.amountTotal ?? 0 }];
}

export function buildAuthoritativeTikTokPurchase(order: Order): TikTokPurchaseEvent | undefined {
  const amountTotal = order.amountTotal;
  if (order.status !== "paid" || order.productId === "FREE-QUICK-START" || typeof amountTotal !== "number" || !Number.isSafeInteger(amountTotal) || amountTotal <= 0) return undefined;
  const contents = paidContents(order);
  if (!contents.length || !order.currency) return undefined;
  return {
    eventId: stableOrderEventId("purchase_completed", order.id),
    orderId: order.id,
    occurredAt: new Date(order.createdAt),
    currency: order.currency.toUpperCase(),
    valueCents: amountTotal,
    contents,
  };
}

/** Sends only after the caller has completed authoritative commerce and Phase 1 work. */
export async function recordAuthoritativeTikTokPurchase(
  order: Order,
  metadata: Record<string, string | undefined>,
  dependencies: TikTokPurchaseDependencies = {},
): Promise<TikTokPurchaseIntegrationResult> {
  if (!verifyAdvertisingConsentMetadata(metadata, dependencies.now)) return { status: "skipped", reason: "consent_ineligible" };
  const event = buildAuthoritativeTikTokPurchase(order);
  if (!event) return { status: "skipped", reason: "order_ineligible" };
  try {
    const result = await (dependencies.send ?? sendTikTokEvent)(event);
    console.info("[tiktok-events-api] purchase result", { orderId: order.id, eventId: event.eventId, status: result.status, ...(result.status !== "sent" ? { reason: result.reason } : {}) });
    return result;
  } catch (error) {
    console.error("[tiktok-events-api] purchase integration failed", { orderId: order.id, eventId: event.eventId, category: "integration_error", error: error instanceof Error ? error.name : "unknown" });
    return { status: "failed", reason: "integration_error" };
  }
}
