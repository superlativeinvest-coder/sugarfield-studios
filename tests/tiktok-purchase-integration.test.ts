import assert from "node:assert/strict";
import test from "node:test";
import { POST as consentPost } from "@/app/api/privacy/advertising-consent/route";
import {
  ADVERTISING_CONSENT_POLICY_VERSION,
  ADVERTISING_CONSENT_SOURCE,
  createAdvertisingConsentSnapshot,
  consentMetadataForRequest,
  serializeAdvertisingConsentCookie,
  signAdvertisingConsentSnapshot,
  verifyAdvertisingConsentCookie,
  verifyAdvertisingConsentMetadata,
} from "@/lib/privacy/advertising-consent-server";
import { buildAuthoritativeTikTokPurchase, recordAuthoritativeTikTokPurchase } from "@/lib/analytics/tiktok-purchase";
import { stableOrderEventId } from "@/lib/analytics/server";
import { mapCanonicalEventToTikTok } from "@/lib/analytics/tiktok-pixel";
import type { TikTokPurchaseEvent, TikTokSendResult } from "@/lib/analytics/tiktok-events-api";
import type { Order } from "@/lib/orders/types";

const SECRET = "synthetic-consent-signing-secret";
const ORDER_ID = "00000000-0000-4000-8000-000000000101";
const FIXED_NOW = new Date("2026-09-29T12:00:00.000Z");
let environmentQueue: Promise<unknown> = Promise.resolve();

function withSecret<T>(callback: () => Promise<T> | T, value: string | undefined = SECRET): Promise<T> {
  const run = environmentQueue.then(async () => {
    const previous = process.env.SUGARFIELD_CONSENT_SIGNING_SECRET;
    if (value === undefined) delete process.env.SUGARFIELD_CONSENT_SIGNING_SECRET;
    else process.env.SUGARFIELD_CONSENT_SIGNING_SECRET = value;
    try {
      return await callback();
    } finally {
      if (previous === undefined) delete process.env.SUGARFIELD_CONSENT_SIGNING_SECRET;
      else process.env.SUGARFIELD_CONSENT_SIGNING_SECRET = previous;
    }
  });
  environmentQueue = run.then(() => undefined, () => undefined);
  return run;
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: ORDER_ID,
    provider: "stripe",
    providerSessionId: "cs_test_checkpoint3",
    productId: "P06",
    status: "paid",
    amountTotal: 2498,
    currency: "usd",
    customerId: "00000000-0000-4000-8000-000000000102",
    fulfillmentStatus: "fulfilled",
    lineItems: [
      { productId: "P06", sku: "P06", unitAmount: 499, quantity: 1, currency: "usd" },
      { productId: "P16", sku: "P16", unitAmount: 1999, quantity: 1, currency: "usd" },
    ],
    entitlements: [{ productId: "P06", grantedAt: FIXED_NOW.toISOString() }],
    createdAt: FIXED_NOW.toISOString(),
    ...overrides,
  };
}

function grantedMetadata(now = FIXED_NOW): Record<string, string> {
  const snapshot = createAdvertisingConsentSnapshot("granted", new Date(now.getTime() - 1000));
  const signature = signAdvertisingConsentSnapshot(snapshot, SECRET);
  assert.ok(signature);
  return {
    advertising_consent_eligible: "granted",
    advertising_consent_policy_version: snapshot.policyVersion,
    advertising_consent_captured_at: snapshot.capturedAt,
    advertising_consent_expires_at: snapshot.expiresAt,
    advertising_consent_source: snapshot.source,
    advertising_consent_signature: signature,
  };
}

function metadataWithSnapshotField(field: "decision" | "policyVersion" | "capturedAt" | "expiresAt" | "source"): Record<string, string> {
  const snapshot = createAdvertisingConsentSnapshot("granted", new Date(FIXED_NOW.getTime() - 1000));
  const modified = { ...snapshot };
  if (field === "decision") modified.decision = "denied";
  if (field === "policyVersion") modified.policyVersion = "v2" as typeof ADVERTISING_CONSENT_POLICY_VERSION;
  if (field === "capturedAt") modified.capturedAt = new Date(FIXED_NOW.getTime() - 2000).toISOString();
  if (field === "expiresAt") modified.expiresAt = new Date(FIXED_NOW.getTime() + 1000).toISOString();
  if (field === "source") modified.source = "forged_source" as typeof ADVERTISING_CONSENT_SOURCE;
  const signature = signAdvertisingConsentSnapshot(snapshot, SECRET)!;
  return {
    advertising_consent_eligible: field === "decision" ? "denied" : "granted",
    advertising_consent_policy_version: modified.policyVersion,
    advertising_consent_captured_at: modified.capturedAt,
    advertising_consent_expires_at: modified.expiresAt,
    advertising_consent_source: modified.source,
    advertising_consent_signature: signature,
  };
}

async function sendAndCapture(order: Order, metadata = grantedMetadata()): Promise<{ result: Awaited<ReturnType<typeof recordAuthoritativeTikTokPurchase>>; event?: Record<string, unknown> }> {
  let event: Record<string, unknown> | undefined;
  const result = await recordAuthoritativeTikTokPurchase(order, metadata, {
    now: FIXED_NOW,
    send: async (input) => { event = input as unknown as Record<string, unknown>; return { status: "sent", eventId: input.eventId }; },
  });
  return { result, event };
}

test("consent endpoint accepts granted and sets an HttpOnly SameSite cookie", async () => {
  await withSecret(async () => {
    const response = await consentPost(new Request("https://example.test/api/privacy/advertising-consent", { method: "POST", body: JSON.stringify({ decision: "granted" }), headers: { "Content-Type": "application/json" } }));
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie ?? "", /sf_advertising_consent=/);
    assert.match(cookie ?? "", /HttpOnly/);
    assert.match(cookie ?? "", /SameSite=Lax/);
    assert.match(cookie ?? "", /Secure/);
  });
});

test("consent endpoint accepts denied", async () => {
  await withSecret(async () => {
    const response = await consentPost(new Request("http://example.test/api/privacy/advertising-consent", { method: "POST", body: JSON.stringify({ decision: "denied" }), headers: { "Content-Type": "application/json" } }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).decision, "denied");
  });
});

test("consent endpoint rejects malformed or extra input", async () => {
  await withSecret(async () => {
    assert.equal((await consentPost(new Request("http://example.test", { method: "POST", body: JSON.stringify({ decision: "unknown" }) }))).status, 400);
    assert.equal((await consentPost(new Request("http://example.test", { method: "POST", body: JSON.stringify({ decision: "granted", source: "client" }) }))).status, 400);
  });
});

test("valid signed cookie verifies with fixed source", async () => {
  await withSecret(() => {
    const snapshot = createAdvertisingConsentSnapshot("granted", new Date(FIXED_NOW.getTime() - 1000));
    const value = serializeAdvertisingConsentCookie(snapshot, false, SECRET)!;
    assert.deepEqual(verifyAdvertisingConsentCookie(value.split(";")[0].split("=").slice(1).join("="), SECRET, FIXED_NOW), snapshot);
  });
});

for (const field of ["decision", "policyVersion", "capturedAt", "expiresAt", "source"] as const) {
  test(`changing signed ${field} invalidates verification`, async () => {
    await withSecret(() => assert.equal(verifyAdvertisingConsentMetadata(metadataWithSnapshotField(field), FIXED_NOW), undefined));
  });
}

test("valid signature cannot be reused with modified Stripe metadata", async () => {
  await withSecret(() => {
    const metadata = grantedMetadata();
    metadata.advertising_consent_eligible = "granted";
    metadata.advertising_consent_expires_at = new Date(FIXED_NOW.getTime() + 60_000).toISOString();
    assert.equal(verifyAdvertisingConsentMetadata(metadata, FIXED_NOW), undefined);
  });
});

test("forged client granted metadata is rejected", async () => {
  await withSecret(() => assert.equal(verifyAdvertisingConsentMetadata({ advertising_consent_eligible: "granted", advertising_consent_policy_version: "v1", advertising_consent_source: ADVERTISING_CONSENT_SOURCE }, FIXED_NOW), undefined));
});

test("checkout metadata is server-derived from the signed cookie", async () => {
  await withSecret(() => {
    const snapshot = createAdvertisingConsentSnapshot("granted", new Date(FIXED_NOW.getTime() - 1000));
    const cookie = serializeAdvertisingConsentCookie(snapshot, false, SECRET)!;
    const request = new Request("http://example.test", { headers: { cookie: cookie.split(";")[0] } });
    const metadata = consentMetadataForRequest(request, FIXED_NOW);
    assert.equal(metadata.advertising_consent_eligible, "granted");
    assert.equal(metadata.advertising_consent_source, ADVERTISING_CONSENT_SOURCE);
    assert.ok(metadata.advertising_consent_signature);
  });
});

test("missing consent bridge secret produces unknown metadata without blocking checkout", async () => {
  await withSecret(() => {
    const metadata = consentMetadataForRequest(new Request("http://example.test"), FIXED_NOW);
    assert.equal(metadata.advertising_consent_eligible, "unknown");
    assert.equal(metadata.advertising_consent_signature, undefined);
  }, undefined);
});

test("missing consent skips TikTok", async () => {
  await withSecret(async () => {
    const result = await recordAuthoritativeTikTokPurchase(baseOrder(), {}, { now: FIXED_NOW, send: async () => { throw new Error("must not send"); } });
    assert.deepEqual(result, { status: "skipped", reason: "consent_ineligible" });
  });
});

test("denied consent skips TikTok", async () => {
  await withSecret(async () => {
    const metadata = grantedMetadata();
    metadata.advertising_consent_eligible = "denied";
    const result = await recordAuthoritativeTikTokPurchase(baseOrder(), metadata, { now: FIXED_NOW, send: async () => { throw new Error("must not send"); } });
    assert.deepEqual(result, { status: "skipped", reason: "consent_ineligible" });
  });
});

test("expired consent skips TikTok", async () => {
  await withSecret(async () => {
    const snapshot = createAdvertisingConsentSnapshot("granted", new Date(FIXED_NOW.getTime() - 181 * 24 * 60 * 60 * 1000));
    const signature = signAdvertisingConsentSnapshot(snapshot, SECRET)!;
    const metadata = { ...grantedMetadata(), advertising_consent_captured_at: snapshot.capturedAt, advertising_consent_expires_at: snapshot.expiresAt, advertising_consent_signature: signature };
    const result = await recordAuthoritativeTikTokPurchase(baseOrder(), metadata, { now: FIXED_NOW, send: async () => { throw new Error("must not send"); } });
    assert.deepEqual(result, { status: "skipped", reason: "consent_ineligible" });
  });
});

test("valid granted consent permits an eligible paid Purchase", async () => {
  await withSecret(async () => {
    const { result } = await sendAndCapture(baseOrder());
    assert.equal(result.status, "sent");
  });
});

test("zero-value orders are excluded", async () => {
  await withSecret(async () => {
    const { result } = await sendAndCapture(baseOrder({ amountTotal: 0 }));
    assert.deepEqual(result, { status: "skipped", reason: "order_ineligible" });
  });
});

test("free Quick Start orders are excluded", async () => {
  await withSecret(async () => {
    const { result } = await sendAndCapture(baseOrder({ productId: "FREE-QUICK-START", amountTotal: 0, lineItems: undefined }));
    assert.deepEqual(result, { status: "skipped", reason: "order_ineligible" });
  });
});

test("multiple authoritative line items map to canonical content", async () => {
  await withSecret(async () => {
    const { event } = await sendAndCapture(baseOrder());
    assert.deepEqual(event?.contents, [
      { contentId: "P06", contentName: "Pokopia Daily Reset", quantity: 1, priceCents: 499 },
      { contentId: "P16", contentName: "Pokopia Adventure Companion", quantity: 1, priceCents: 1999 },
    ]);
  });
});

test("authoritative total and currency are preserved", () => {
  const event = buildAuthoritativeTikTokPurchase(baseOrder({ amountTotal: 3000, currency: "eur", lineItems: [{ productId: "P06", sku: "P06", unitAmount: 3000, quantity: 1, currency: "eur" }] }));
  assert.equal(event?.valueCents, 3000);
  assert.equal(event?.currency, "EUR");
});

test("canonical event ID is derived from orders.id", () => {
  const event = buildAuthoritativeTikTokPurchase(baseOrder());
  assert.equal(event?.eventId, stableOrderEventId("purchase_completed", ORDER_ID));
});

test("duplicate webhook processing reuses one order and event identity", async () => {
  await withSecret(async () => {
    const ids: string[] = [];
    const send = async (event: TikTokPurchaseEvent): Promise<TikTokSendResult> => { ids.push(event.eventId); return { status: "sent", eventId: event.eventId }; };
    await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW, send });
    await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW, send });
    assert.deepEqual(ids, [stableOrderEventId("purchase_completed", ORDER_ID), stableOrderEventId("purchase_completed", ORDER_ID)]);
  });
});

test("transport retries preserve the canonical event ID", async () => {
  await withSecret(async () => {
    const ids: string[] = [];
    const send = async (event: TikTokPurchaseEvent): Promise<TikTokSendResult> => { ids.push(event.eventId); return { status: "failed", reason: "timeout" }; };
    const result = await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW, send });
    assert.equal(result.status, "failed");
    assert.deepEqual(ids, [stableOrderEventId("purchase_completed", ORDER_ID)]);
  });
});

for (const [label, expectedResult] of [["timeout", { status: "failed", reason: "timeout" }], ["429", { status: "failed", reason: "rate_limited" }], ["500", { status: "failed", reason: "http_5xx" }], ["400", { status: "failed", reason: "http_4xx" }], ["auth", { status: "failed", reason: "authentication_failure" }]] as const) {
  test(`TikTok ${label} failure remains fail-open`, async () => {
    await withSecret(async () => {
      const actualResult = await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW, send: async () => expectedResult });
      assert.deepEqual(actualResult, expectedResult);
    });
  });
}

test("missing TikTok configuration remains a safe skipped result", async () => {
  await withSecret(async () => {
    const previousToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    const previousPixel = process.env.TIKTOK_PIXEL_ID;
    delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    delete process.env.TIKTOK_PIXEL_ID;
    try {
      const result = await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW });
      assert.deepEqual(result, { status: "skipped", reason: "missing_configuration" });
    } finally {
      if (previousToken === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN; else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = previousToken;
      if (previousPixel === undefined) delete process.env.TIKTOK_PIXEL_ID; else process.env.TIKTOK_PIXEL_ID = previousPixel;
    }
  });
});

test("purchase integration does not mutate entitlements or fulfillment", async () => {
  await withSecret(async () => {
    const order = baseOrder();
    const before = JSON.stringify({ entitlements: order.entitlements, fulfillmentStatus: order.fulfillmentStatus });
    await recordAuthoritativeTikTokPurchase(order, grantedMetadata(), { now: FIXED_NOW, send: async (event) => ({ status: "sent", eventId: event.eventId }) });
    assert.equal(JSON.stringify({ entitlements: order.entitlements, fulfillmentStatus: order.fulfillmentStatus }), before);
  });
});

test("no browser Purchase event is introduced", () => {
  assert.equal(mapCanonicalEventToTikTok("purchase_completed"), undefined);
});

test("Purchase event contains no personal identifiers or Advanced Matching fields", async () => {
  await withSecret(async () => {
    let captured: TikTokPurchaseEvent | undefined;
    await recordAuthoritativeTikTokPurchase(baseOrder(), grantedMetadata(), { now: FIXED_NOW, send: async (event) => { captured = event; return { status: "sent", eventId: event.eventId }; } });
    const serialized = JSON.stringify(captured);
    for (const field of ["email", "phone", "ip", "userAgent", "external_id", "address", "entitlement", "qualification"]) assert.equal(serialized.includes(field), false, field);
  });
});
