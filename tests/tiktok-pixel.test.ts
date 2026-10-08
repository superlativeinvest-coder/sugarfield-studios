import assert from "node:assert/strict";
import test from "node:test";
import { dispatchTikTokEvent, getTikTokPixelConfig, initializeTikTokPixel, mapCanonicalEventToTikTok } from "@/lib/analytics/tiktok-pixel";
import { trackFunnelEvent } from "@/lib/analytics/transport";

type FakeScript = {
  async: boolean;
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
};

function installDom() {
  const scripts: FakeScript[] = [];
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;
  const windowMock = { ttq: undefined as unknown, __sugarfieldTikTokPixel: undefined as unknown };
  const documentMock = {
    scripts,
    createElement: () => {
      const attributes = new Map<string, string>();
      const script: FakeScript = {
        async: false,
        src: "",
        onload: null,
        onerror: null,
        setAttribute: (name, value) => attributes.set(name, value),
        getAttribute: (name) => attributes.get(name) ?? null,
      };
      return script;
    },
    head: { appendChild: (script: FakeScript) => { scripts.push(script); } },
  };
  (globalThis as unknown as { window: unknown }).window = windowMock;
  (globalThis as unknown as { document: unknown }).document = documentMock;

  return {
    scripts,
    windowMock,
    restore: () => {
      if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
      else (globalThis as unknown as { window: unknown }).window = originalWindow;
      if (originalDocument === undefined) delete (globalThis as unknown as { document?: unknown }).document;
      else (globalThis as unknown as { document: unknown }).document = originalDocument;
    },
  };
}

test("Pixel configuration requires explicit enablement and keeps production disabled", () => {
  assert.equal(getTikTokPixelConfig({ NODE_ENV: "development" }).enabled, false);
  assert.deepEqual(getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "production" }), {
    pixelId: "staging-id",
    enabled: true,
    environment: "staging",
    productionBlocked: false,
    requiresAdvertisingConsent: false,
  });
  const production = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "production-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "false", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NODE_ENV: "production" });
  assert.equal(production.enabled, false);
  assert.equal(production.requiresAdvertisingConsent, true);
  assert.equal(production.productionBlocked, true);
});

test("missing Pixel ID is a safe no-op", () => {
  const dom = installDom();
  try {
    assert.deepEqual(initializeTikTokPixel(getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging" })), { status: "disabled", reason: "missing_pixel_id" });
    assert.equal(dom.scripts.length, 0);
  } finally {
    dom.restore();
  }
});

test("repeated initialization and Strict Mode remounts create one script and one queued page", () => {
  const dom = installDom();
  try {
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "preview", NODE_ENV: "production" });
    assert.equal(initializeTikTokPixel(config).status, "initialized");
    assert.equal(initializeTikTokPixel(config).status, "already_initialized");
    assert.equal(initializeTikTokPixel(config).status, "already_initialized");
    assert.equal(dom.scripts.length, 1);
    const queue = dom.windowMock.ttq as unknown[];
    assert.equal(queue.filter((entry) => Array.isArray(entry) && entry[0] === "page").length, 1);
  } finally {
    dom.restore();
  }
});

test("blocked script failures are captured without throwing into the app", () => {
  const dom = installDom();
  try {
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "production" });
    assert.doesNotThrow(() => initializeTikTokPixel(config));
    dom.scripts[0]?.onerror?.();
    assert.equal((dom.windowMock.__sugarfieldTikTokPixel as { status: string }).status, "failed");
  } finally {
    dom.restore();
  }
});

test("production configuration requires consent even with a Pixel ID", () => {
  const dom = installDom();
  try {
    const result = initializeTikTokPixel(getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "production-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NODE_ENV: "production" }));
    assert.deepEqual(result, { status: "disabled", reason: "consent_required" });
    assert.equal(dom.scripts.length, 0);
  } finally {
    dom.restore();
  }
});

test("canonical events map only to the approved TikTok standard events", () => {
  assert.equal(mapCanonicalEventToTikTok("free_start_viewed")?.eventName, "ViewContent");
  assert.equal(mapCanonicalEventToTikTok("email_submitted")?.eventName, "SubmitForm");
  assert.equal(mapCanonicalEventToTikTok("p06_viewed")?.eventName, "ViewContent");
  assert.equal(mapCanonicalEventToTikTok("p16_viewed")?.eventName, "ViewContent");
  assert.equal(mapCanonicalEventToTikTok("p18_viewed")?.eventName, "ViewContent");
  assert.equal(mapCanonicalEventToTikTok("p17_viewed")?.eventName, "ViewContent");
  assert.equal(mapCanonicalEventToTikTok("p06_buy_clicked")?.eventName, "AddToCart");
  assert.equal(mapCanonicalEventToTikTok("p16_buy_clicked")?.eventName, "AddToCart");
  assert.equal(mapCanonicalEventToTikTok("p18_buy_clicked")?.eventName, "AddToCart");
  assert.equal(mapCanonicalEventToTikTok("p17_buy_clicked")?.eventName, "AddToCart");
  assert.equal(mapCanonicalEventToTikTok("checkout_started")?.eventName, "InitiateCheckout");
  assert.equal(mapCanonicalEventToTikTok("p06_skipped"), undefined);
  assert.equal(mapCanonicalEventToTikTok("p16_skipped"), undefined);
  assert.equal(mapCanonicalEventToTikTok("p18_skipped"), undefined);
  assert.equal(mapCanonicalEventToTikTok("p17_skipped"), undefined);
  assert.equal(mapCanonicalEventToTikTok("p18_not_qualified"), undefined);
  assert.equal(mapCanonicalEventToTikTok("funnel_completed"), undefined);
  assert.equal(mapCanonicalEventToTikTok("purchase_completed"), undefined);
});

test("product parameters use canonical content, configured price, USD, and decimal value", () => {
  const mapped = mapCanonicalEventToTikTok("p06_buy_clicked", { productId: "P06", productPriceCents: 499, selectedProducts: ["P06"], cartValueCents: 499 });
  assert.deepEqual(mapped, {
    eventName: "AddToCart",
    properties: {
      contents: [{ content_id: "P06", content_name: "POKOPIA DAILY RESET CHECKLIST", quantity: 1, price: 4.99 }],
      content_type: "product",
      currency: "USD",
      value: 4.99,
    },
  });
  const checkout = mapCanonicalEventToTikTok("checkout_started", { selectedProducts: ["P06", "P16"], cartValueCents: 2498 });
  assert.equal(checkout?.eventName, "InitiateCheckout");
  assert.equal(checkout?.properties.value, 24.98);
  assert.deepEqual(checkout?.properties.contents?.map((item) => item.content_id), ["P06", "P16"]);
});

test("dispatch preserves the exact canonical event ID and deduplicates repeated logical actions", () => {
  const dom = installDom();
  try {
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "production" });
    assert.equal(initializeTikTokPixel(config).status, "initialized");
    const eventId = "00000000-0000-4000-8000-000000000099";
    assert.equal(dispatchTikTokEvent({ eventName: "p06_buy_clicked", productId: "P06", productPriceCents: 499 }, eventId, config), "dispatched");
    assert.equal(dispatchTikTokEvent({ eventName: "p06_buy_clicked", productId: "P06", productPriceCents: 499 }, eventId, config), "deduplicated");
    const queue = dom.windowMock.ttq as unknown[];
    const tracked = queue.find((entry) => Array.isArray(entry) && entry[0] === "track") as unknown[];
    assert.equal(tracked[1], "AddToCart");
    assert.deepEqual(tracked[3], { event_id: eventId });
  } finally {
    dom.restore();
  }
});

test("disabled or unavailable Pixel fails open without dispatch", () => {
  const dom = installDom();
  try {
    const eventId = "00000000-0000-4000-8000-000000000100";
    assert.equal(dispatchTikTokEvent({ eventName: "email_submitted" }, eventId), "disabled");
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "production" });
    assert.equal(initializeTikTokPixel(config).status, "initialized");
    dom.windowMock.ttq = undefined;
    assert.equal(dispatchTikTokEvent({ eventName: "email_submitted" }, eventId, config), "unavailable");
  } finally {
    dom.restore();
  }
});

test("dispatch never sends email or protected data", () => {
  const mapped = mapCanonicalEventToTikTok("email_submitted", { productId: "P06", productPriceCents: 499 });
  assert.deepEqual(mapped, { eventName: "SubmitForm", properties: {} });
});

test("Phase 1 transport and TikTok dispatch receive the same canonical event ID", async () => {
  const dom = installDom();
  const originalEnvironment = {
    id: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
    enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
    environment: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENV,
  };
  try {
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "staging-id";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENV = "staging";
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "test" });
    initializeTikTokPixel(config);
    const requests: Record<string, unknown>[] = [];
    (dom.windowMock as unknown as { fetch: (url: string, init: RequestInit) => Promise<Response> }).fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return { ok: true, json: async () => ({ ok: true, persisted: true }) } as Response;
    };
    const eventId = "00000000-0000-4000-8000-000000000101";
    const result = await trackFunnelEvent({ eventName: "p06_buy_clicked", eventId, productId: "P06", productPriceCents: 499, pagePath: "/pokopia/daily-reset", anonymousId: "00000000-0000-4000-8000-000000000102", attribution: { firstTouch: {}, currentTouch: {} } });
    assert.equal(result.eventId, eventId);
    assert.equal(requests[0]?.eventId, eventId);
    const queue = dom.windowMock.ttq as unknown[];
    const tracked = queue.find((entry) => Array.isArray(entry) && entry[0] === "track") as unknown[];
    assert.deepEqual(tracked[3], { event_id: eventId });
  } finally {
    if (originalEnvironment.id === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
    else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = originalEnvironment.id;
    if (originalEnvironment.enabled === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;
    else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = originalEnvironment.enabled;
    if (originalEnvironment.environment === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENV;
    else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENV = originalEnvironment.environment;
    dom.restore();
  }
});
