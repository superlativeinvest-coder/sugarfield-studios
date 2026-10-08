import assert from "node:assert/strict";
import test from "node:test";
import { sendTikTokEvent, type TikTokPurchaseEvent } from "@/lib/analytics/tiktok-events-api";

const TOKEN = "synthetic-events-api-token";
const PIXEL_ID = "synthetic-pixel-id";
const EVENT_ID = "00000000-0000-4000-8000-000000000001";

const baseEvent: TikTokPurchaseEvent = {
  eventId: EVENT_ID,
  orderId: "00000000-0000-4000-8000-000000000002",
  occurredAt: new Date("2026-09-29T12:34:56.000Z"),
  currency: "USD",
  valueCents: 1299,
  contents: [{ contentId: "P06", contentName: "Daily Reset Guide", quantity: 1, priceCents: 1299 }],
};

type CapturedPayload = {
  data: Array<{
    event_id?: string;
    properties: {
      value: number;
      contents: Array<{ content_id: string; content_name: string; quantity: number; price: number }>;
    };
  }>;
};

function response(status: number): Response {
  return { status, ok: status >= 200 && status < 300 } as Response;
}

function setConfig(token: string | null = TOKEN, pixelId: string | null = PIXEL_ID): () => void {
  const previousToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  const previousPixelId = process.env.TIKTOK_PIXEL_ID;
  if (token === null) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = token;
  if (pixelId === null) delete process.env.TIKTOK_PIXEL_ID;
  else process.env.TIKTOK_PIXEL_ID = pixelId;
  return () => {
    if (previousToken === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = previousToken;
    if (previousPixelId === undefined) delete process.env.TIKTOK_PIXEL_ID;
    else process.env.TIKTOK_PIXEL_ID = previousPixelId;
  };
}

async function withConfig<T>(callback: () => Promise<T>, token: string | null = TOKEN, pixelId: string | null = PIXEL_ID): Promise<T> {
  const restore = setConfig(token, pixelId);
  try {
    return await callback();
  } finally {
    restore();
  }
}

function immediateSleep(): Promise<void> {
  return Promise.resolve();
}

test("successfully transmits a Purchase event", async () => {
  const requests: RequestInit[] = [];
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async (_url, init) => { requests.push(init ?? {}); return response(200); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "sent", eventId: EVENT_ID });
  assert.equal(requests.length, 1);
});

test("missing access token is skipped without a request", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, { fetchImpl: async () => { calls += 1; return response(200); } }), null, PIXEL_ID);
  assert.deepEqual(result, { status: "skipped", reason: "missing_configuration" });
  assert.equal(calls, 0);
});

test("missing Pixel or Data Source ID is skipped without a request", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, { fetchImpl: async () => { calls += 1; return response(200); } }), TOKEN, null);
  assert.deepEqual(result, { status: "skipped", reason: "missing_configuration" });
  assert.equal(calls, 0);
});

test("malformed configuration is skipped safely", async () => {
  const result = await withConfig(() => sendTikTokEvent(baseEvent), `${TOKEN}\nnot-valid`, PIXEL_ID);
  assert.deepEqual(result, { status: "skipped", reason: "invalid_configuration" });
});

test("invalid event ID is rejected before transmission", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent({ ...baseEvent, eventId: "not-a-uuid" }, { fetchImpl: async () => { calls += 1; return response(200); } }));
  assert.deepEqual(result, { status: "failed", reason: "invalid_event_id" });
  assert.equal(calls, 0);
});

test("malformed non-object input is rejected without throwing", async () => {
  const result = await withConfig(() => sendTikTokEvent(null as unknown as TikTokPurchaseEvent));
  assert.deepEqual(result, { status: "failed", reason: "invalid_event" });
});

test("invalid timestamp is rejected before transmission", async () => {
  const result = await withConfig(() => sendTikTokEvent({ ...baseEvent, occurredAt: new Date("invalid") }));
  assert.deepEqual(result, { status: "failed", reason: "invalid_timestamp" });
});

test("invalid currency is rejected before transmission", async () => {
  const result = await withConfig(() => sendTikTokEvent({ ...baseEvent, currency: "usd" }));
  assert.deepEqual(result, { status: "failed", reason: "invalid_currency" });
});

test("invalid value is rejected before transmission", async () => {
  const result = await withConfig(() => sendTikTokEvent({ ...baseEvent, valueCents: 12.5 }));
  assert.deepEqual(result, { status: "failed", reason: "invalid_value" });
});

test("invalid contents are rejected before transmission", async () => {
  const result = await withConfig(() => sendTikTokEvent({ ...baseEvent, contents: [] }));
  assert.deepEqual(result, { status: "failed", reason: "invalid_contents" });
});

test("unsupported event fields are rejected", async () => {
  const unsupported = { ...baseEvent, eventName: "ViewContent" } as unknown as TikTokPurchaseEvent;
  const result = await withConfig(() => sendTikTokEvent(unsupported));
  assert.deepEqual(result, { status: "failed", reason: "unsupported_event_or_field" });
});

test("timeouts are bounded and classified", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async (_url, init) => {
      calls += 1;
      await new Promise<void>((resolve) => init?.signal?.addEventListener("abort", () => resolve(), { once: true }));
      throw new DOMException("Aborted", "AbortError");
    },
    timeoutMs: 1,
    maxAttempts: 2,
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "timeout" });
  assert.equal(calls, 2);
});

test("network failures are retried and then fail open", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; throw new Error("synthetic network failure"); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "network_error" });
  assert.equal(calls, 3);
});

test("HTTP 429 is retriable", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; return response(429); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "rate_limited" });
  assert.equal(calls, 3);
});

test("HTTP 500 is retriable", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; return response(500); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "http_5xx" });
  assert.equal(calls, 3);
});

test("permanent HTTP 400 is not retried", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; return response(400); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "http_4xx" });
  assert.equal(calls, 1);
});

test("authentication failure is not retried", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; return response(401); },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "failed", reason: "authentication_failure" });
  assert.equal(calls, 1);
});

test("retry count is bounded", async () => {
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async () => { calls += 1; return response(503); },
    maxAttempts: 99,
    sleep: immediateSleep,
  }));
  assert.equal(result.status, "failed");
  assert.equal(calls, 3);
});

test("the same event ID is preserved across retries", async () => {
  const bodies: string[] = [];
  let calls = 0;
  const result = await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async (_url, init) => {
      calls += 1;
      bodies.push(String(init?.body));
      return calls < 3 ? response(500) : response(200);
    },
    sleep: immediateSleep,
  }));
  assert.deepEqual(result, { status: "sent", eventId: EVENT_ID });
  assert.equal(calls, 3);
  assert.equal(new Set(bodies.map((body) => JSON.parse(body).data[0].event_id)).size, 1);
  assert.equal(JSON.parse(bodies[0]).data[0].event_id, EVENT_ID);
});

test("converts cents to decimal major units", async () => {
  let payload: CapturedPayload | undefined;
  await withConfig(() => sendTikTokEvent({ ...baseEvent, valueCents: 1234, contents: [{ ...baseEvent.contents[0], priceCents: 999 }] }, {
    fetchImpl: async (_url, init) => { payload = JSON.parse(String(init?.body)) as CapturedPayload; return response(200); },
  }));
  assert.equal(payload?.data[0].properties.value, 12.34);
  assert.equal(payload?.data[0].properties.contents[0].price, 9.99);
});

test("maps canonical content fields", async () => {
  let payload: CapturedPayload | undefined;
  await withConfig(() => sendTikTokEvent({ ...baseEvent, contents: [{ contentId: "P16", contentName: "Adventure Dashboard", quantity: 2, priceCents: 700 }] }, {
    fetchImpl: async (_url, init) => { payload = JSON.parse(String(init?.body)) as CapturedPayload; return response(200); },
  }));
  assert.deepEqual(payload?.data[0].properties.contents, [{ content_id: "P16", content_name: "Adventure Dashboard", quantity: 2, price: 7 }]);
});

test("does not include personal identifiers or protected fields", async () => {
  let payload: CapturedPayload | undefined;
  await withConfig(() => sendTikTokEvent(baseEvent, {
    fetchImpl: async (_url, init) => { payload = JSON.parse(String(init?.body)) as CapturedPayload; return response(200); },
  }));
  const serialized = JSON.stringify(payload);
  for (const prohibited of ["email", "phone", "ip", "user_agent", "external_id", "address", "entitlement", "qualification", "stripe_secret"]) {
    assert.equal(serialized.includes(prohibited), false, prohibited);
  }
});

test("does not expose the access token in errors or logs", async () => {
  const messages: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => messages.push(JSON.stringify(args));
  try {
    const result = await withConfig(() => sendTikTokEvent(baseEvent, {
      fetchImpl: async () => { throw new Error(`request failed with ${TOKEN}`); },
      sleep: immediateSleep,
    }));
    assert.deepEqual(result, { status: "failed", reason: "network_error" });
  } finally {
    console.error = originalError;
  }
  assert.equal(messages.join("\n").includes(TOKEN), false);
  assert.equal(messages.join("\n").includes("Authorization"), false);
});

test("returns a fail-open result rather than throwing", async () => {
  await assert.doesNotReject(async () => {
    const result = await withConfig(() => sendTikTokEvent(baseEvent, {
      fetchImpl: async () => { throw new Error("synthetic outage"); },
      maxAttempts: 1,
    }));
    assert.deepEqual(result, { status: "failed", reason: "network_error" });
  });
});
