import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAttributionState } from "@/lib/attribution/capture";
import type { Order } from "@/lib/orders/types";
import type { PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AnalyticsEventRow = Record<string, unknown>;
export type AnalyticsInsertResult = { ok: boolean; deduplicated?: boolean; unavailable?: boolean };

export async function insertAnalyticsEventRow(row: AnalyticsEventRow, suppliedClient?: SupabaseClient): Promise<AnalyticsInsertResult> {
  const client = suppliedClient ?? getSupabaseServerClient();
  if (!client) return { ok: false, unavailable: true };
  const { error } = await client.from("analytics_events").insert(row);
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: true, deduplicated: true };
  console.error("[analytics] insert failed", { code: error.code, message: error.message });
  return { ok: false };
}

export function stableOrderEventId(eventName: "checkout_completed" | "purchase_completed", orderId: string): string {
  const hex = createHash("sha256").update(`sugarfield:${eventName}:${orderId}`, "utf8").digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function orderAttribution(order: Order, journey?: PokopiaJourney | null) {
  return normalizeAttributionState({
    firstTouch: journey?.firstTouchAttribution ?? order.firstTouchAttribution,
    currentTouch: journey?.currentAttribution ?? order.currentTouchAttribution,
  });
}

function orderEventRow(eventName: "checkout_completed" | "purchase_completed", order: Order, journeyId: string | undefined, journey?: PokopiaJourney | null): AnalyticsEventRow {
  const attribution = orderAttribution(order, journey);
  const current = attribution?.currentTouch ?? {};
  const first = attribution?.firstTouch ?? {};
  const currency = (order.currency ?? "USD").toUpperCase();
  const selectedProducts = order.lineItems?.map((item) => item.productId) ?? [order.productId];
  return {
    event_id: stableOrderEventId(eventName, order.id), event_name: eventName, occurred_at: order.createdAt, received_at: new Date().toISOString(),
    journey_id: journeyId ?? null, anonymous_id: journey?.anonymousId ?? null, user_id: order.customerId ?? null, session_id: order.funnelSession ?? null,
    source: current.utm_source ?? null, medium: current.utm_medium ?? null, campaign: current.utm_campaign ?? null, content_id: current.content_id ?? current.utm_content ?? null, term: current.utm_term ?? null,
    utm_source: current.utm_source ?? null, utm_medium: current.utm_medium ?? null, utm_campaign: current.utm_campaign ?? null, utm_content: current.utm_content ?? null, utm_term: current.utm_term ?? null, ttclid: current.ttclid ?? null,
    landing_page: current.landing_page ?? first.landing_page ?? null, page_path: null, referrer: current.referrer ?? first.referrer ?? null, funnel_step: order.funnelStep ?? "checkout", previous_step: null,
    product_id: order.productId, product_price_cents: order.amountTotal ?? null, selected_products: selectedProducts, cart_value_cents: order.amountTotal ?? null, order_id: order.id,
    revenue_cents: eventName === "purchase_completed" ? order.amountTotal ?? null : null, currency, device_type: null, browser: null, os: null,
    metadata: { analytics_source: "stripe_confirmed_order", attribution_first_touch: first, attribution_current_touch: current },
  };
}

/** Records only trusted Stripe-confirmed order observations. It never throws into the payment path. */
export async function recordAuthoritativeOrderAnalytics(order: Order, journeyId?: string, journey?: PokopiaJourney | null, suppliedClient?: SupabaseClient): Promise<void> {
  try {
    const checkout = await insertAnalyticsEventRow(orderEventRow("checkout_completed", order, journeyId, journey), suppliedClient);
    if (!checkout.ok) console.error("[analytics] checkout_completed was not persisted", { orderId: order.id });
    const purchase = await insertAnalyticsEventRow(orderEventRow("purchase_completed", order, journeyId, journey), suppliedClient);
    if (!purchase.ok) console.error("[analytics] purchase_completed was not persisted", { orderId: order.id });
  } catch (error) {
    console.error("[analytics] authoritative order analytics failed", { orderId: order.id, error });
  }
}
