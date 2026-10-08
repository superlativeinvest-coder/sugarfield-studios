import assert from "node:assert/strict";
import test from "node:test";
import { validateAnalyticsClientPayload } from "@/lib/analytics/contract";
import { canonicalEventForLegacyEvent } from "@/lib/analytics/taxonomy";
import { getRouteVisitId, trackFunnelEvent, trackFunnelPageView } from "@/lib/analytics/transport";
import { recordAuthoritativeOrderAnalytics, stableOrderEventId } from "@/lib/analytics/server";
import type { Order } from "@/lib/orders/types";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("canonical analytics payloads validate and generate one event ID", () => {
  const result = validateAnalyticsClientPayload({ eventName: "p06_viewed", pagePath: "/pokopia/daily-reset", productPriceCents: 499 });
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.value.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("malformed, unsupported, protected, and server-only payloads are rejected", () => {
  assert.equal(validateAnalyticsClientPayload({ eventName: "pokopia_daily_reset_viewed" }).ok, false);
  assert.equal(validateAnalyticsClientPayload({ eventName: "p06_viewed", revenueCents: 499 }).ok, false);
  assert.equal(validateAnalyticsClientPayload({ eventName: "purchase_completed", orderId: "00000000-0000-4000-8000-000000000000" }).ok, false);
  assert.equal(validateAnalyticsClientPayload({ eventName: "p06_viewed", productPriceCents: -1 }).ok, false);
});

test("legacy compatibility maps to one canonical name without creating a second event", () => {
  assert.equal(canonicalEventForLegacyEvent("pokopia_daily_reset_viewed"), "p06_viewed");
  assert.equal(canonicalEventForLegacyEvent("pokopia_funnel_offer_accepted"), undefined);
});

test("authoritative order event IDs are stable per order and distinct by event", () => {
  const checkout = stableOrderEventId("checkout_completed", "00000000-0000-4000-8000-000000000101");
  const purchase = stableOrderEventId("purchase_completed", "00000000-0000-4000-8000-000000000101");
  assert.match(checkout, /^[0-9a-f-]{36}$/i);
  assert.equal(checkout, stableOrderEventId("checkout_completed", "00000000-0000-4000-8000-000000000101"));
  assert.notEqual(checkout, purchase);
});

test("authoritative order analytics remains one checkout and one purchase across webhook retries", async () => {
  const rows = new Map<string, Record<string, unknown>>();
  const fakeClient = { from: () => ({ insert: async (row: Record<string, unknown>) => { if (rows.has(String(row.event_id))) return { error: { code: "23505", message: "duplicate" } }; rows.set(String(row.event_id), row); return { error: null }; } }) } as never;
  const order: Order = { id: "00000000-0000-4000-8000-000000000202", provider: "stripe", providerSessionId: "cs_test_checkpoint4", productId: "P06", status: "paid", amountTotal: 499, currency: "usd", customerId: "00000000-0000-4000-8000-000000000203", funnelId: "pokopia_daily_reset", funnelStep: "checkout", fulfillmentStatus: "fulfilled", lineItems: [{ productId: "P06", sku: "P06", unitAmount: 499, quantity: 1, currency: "usd" }], entitlements: [], createdAt: "2026-09-28T00:00:00.000Z" };
  await recordAuthoritativeOrderAnalytics(order, "00000000-0000-4000-8000-000000000204", null, fakeClient);
  await recordAuthoritativeOrderAnalytics(order, "00000000-0000-4000-8000-000000000204", null, fakeClient);
  assert.equal(rows.size, 2);
  assert.equal(rows.get(stableOrderEventId("purchase_completed", order.id))?.order_id, order.id);
  assert.equal(rows.get(stableOrderEventId("purchase_completed", order.id))?.revenue_cents, 499);
});

test("browser transport preserves its event ID and fails open", async () => {
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const body: Record<string, unknown>[] = [];
  const windowMock = {
    location: { search: "?utm_source=tiktok&utm_content=TT_003", pathname: "/pokopia/daily-reset" },
    document: { cookie: "sf_anonymous_id=00000000-0000-4000-8000-000000000003", referrer: "https://example.test" },
    history: { state: {}, replaceState(next: Record<string, unknown>) { this.state = next; } },
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    fetch: async (_url: string, init: RequestInit) => { body.push(JSON.parse(String(init.body))); return { ok: true, json: async () => ({ ok: true, persisted: true }) }; },
  };
  (globalThis as unknown as { window: unknown }).window = windowMock;
  try {
    const sent = await trackFunnelEvent({ eventName: "p06_viewed", pagePath: "/pokopia/daily-reset" });
    assert.equal(sent.ok, true);
    assert.equal(body.length, 1);
    assert.equal(body[0].eventId, sent.eventId);
    assert.equal((body[0].attribution as { currentTouch: { content_id: string } }).currentTouch.content_id, "TT_003");

    windowMock.fetch = async () => { throw new Error("synthetic analytics outage"); };
    const failed = await trackFunnelEvent({ eventName: "p06_skipped" });
    assert.equal(failed.ok, false);
    assert.match(failed.eventId, /^[0-9a-f-]{36}$/i);
  } finally {
    if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
    else (globalThis as unknown as { window: unknown }).window = originalWindow;
  }
});

test("route visits deduplicate remounts but create a new ID for a new history entry", async () => {
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const sent: Record<string, unknown>[] = [];
  const windowMock = {
    location: { href: "http://example.test/pokopia/start", pathname: "/pokopia/start", search: "" },
    document: { cookie: "", referrer: "" },
    history: { state: {}, replaceState(next: Record<string, unknown>) { this.state = next; } },
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    fetch: async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return { ok: true, json: async () => ({ ok: true, persisted: true }) }; },
  };
  (globalThis as unknown as { window: unknown }).window = windowMock;
  try {
    const firstVisit = getRouteVisitId();
    const first = await trackFunnelPageView("free_start_viewed", { funnelStep: "start" });
    const remount = await trackFunnelPageView("free_start_viewed", { funnelStep: "start" });
    assert.equal(first.eventId, remount.eventId);
    assert.equal(sent[0].eventId, sent[1].eventId);
    windowMock.history.state = {};
    windowMock.location.href = "http://example.test/pokopia/start";
    const secondVisit = getRouteVisitId();
    const later = await trackFunnelPageView("free_start_viewed", { funnelStep: "start" });
    assert.notEqual(firstVisit, secondVisit);
    assert.notEqual(first.eventId, later.eventId);
  } finally {
    if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
    else (globalThis as unknown as { window: unknown }).window = originalWindow;
  }
});
