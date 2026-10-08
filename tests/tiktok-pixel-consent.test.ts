import assert from "node:assert/strict";
import test from "node:test";
import { CONSENT_STORAGE_KEY, saveConsent } from "@/lib/privacy/consent";
import { dispatchTikTokEvent, getTikTokPixelConfig, initializeTikTokPixel } from "@/lib/analytics/tiktok-pixel";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function installBrowser() {
  const scripts: Array<{ attrs: Map<string, string>; onload: (() => void) | null; onerror: (() => void) | null; setAttribute: (name: string, value: string) => void; getAttribute: (name: string) => string | null }> = [];
  const storage = new MemoryStorage();
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;
  const windowMock = {
    localStorage: storage,
    ttq: undefined as unknown,
    __sugarfieldTikTokPixel: undefined as unknown,
    dispatchEvent: () => true,
  };
  const documentMock = {
    scripts,
    createElement: () => {
      const attrs = new Map<string, string>();
      const script = {
        attrs,
        onload: null,
        onerror: null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
        getAttribute: (name: string) => attrs.get(name) ?? null,
      };
      return script;
    },
    head: { appendChild: (script: (typeof scripts)[number]) => scripts.push(script) },
  };
  (globalThis as unknown as { window: unknown }).window = windowMock;
  (globalThis as unknown as { document: unknown }).document = documentMock;
  return {
    scripts,
    storage,
    windowMock,
    restore: () => {
      if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
      else (globalThis as unknown as { window: unknown }).window = originalWindow;
      if (originalDocument === undefined) delete (globalThis as unknown as { document?: unknown }).document;
      else (globalThis as unknown as { document: unknown }).document = originalDocument;
    },
  };
}

const productionConfig = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "production-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NODE_ENV: "production" });
const stagingConfig = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "staging-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "staging", NODE_ENV: "production" });

test("production does not load without an advertising consent choice", () => {
  const browser = installBrowser();
  try {
    assert.deepEqual(initializeTikTokPixel(productionConfig), { status: "disabled", reason: "consent_required" });
    assert.equal(browser.scripts.length, 0);
  } finally { browser.restore(); }
});

test("production does not load after advertising consent is rejected", () => {
  const browser = installBrowser();
  try {
    saveConsent({ analytics: "unknown", advertising: "denied" }, browser.storage);
    assert.deepEqual(initializeTikTokPixel(productionConfig), { status: "disabled", reason: "consent_required" });
    assert.equal(browser.scripts.length, 0);
  } finally { browser.restore(); }
});

test("granted advertising consent loads production once", () => {
  const browser = installBrowser();
  try {
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    assert.equal(initializeTikTokPixel(productionConfig).status, "initialized");
    assert.equal(initializeTikTokPixel(productionConfig).status, "already_initialized");
    assert.equal(browser.scripts.length, 1);
  } finally { browser.restore(); }
});

test("repeated consent grants do not duplicate initialization", () => {
  const browser = installBrowser();
  try {
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    initializeTikTokPixel(productionConfig);
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    initializeTikTokPixel(productionConfig);
    assert.equal(browser.scripts.length, 1);
  } finally { browser.restore(); }
});

test("withdrawal prevents future production dispatch and regrant reuses the loader", () => {
  const browser = installBrowser();
  try {
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    initializeTikTokPixel(productionConfig);
    const eventId = "00000000-0000-4000-8000-000000000201";
    saveConsent({ analytics: "unknown", advertising: "denied" }, browser.storage);
    assert.equal(dispatchTikTokEvent({ eventName: "p06_viewed", productId: "P06" }, eventId, productionConfig), "disabled");
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    assert.equal(initializeTikTokPixel(productionConfig).status, "already_initialized");
    assert.equal(browser.scripts.length, 1);
  } finally { browser.restore(); }
});

test("staging behavior remains independent of advertising consent", () => {
  const browser = installBrowser();
  try {
    assert.equal(initializeTikTokPixel(stagingConfig).status, "initialized");
    assert.equal(browser.scripts.length, 1);
  } finally { browser.restore(); }
});

test("production remains disabled until explicitly configured", () => {
  const browser = installBrowser();
  try {
    saveConsent({ analytics: "unknown", advertising: "granted" }, browser.storage);
    const disabled = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "production-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "false", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NODE_ENV: "production" });
    assert.deepEqual(initializeTikTokPixel(disabled), { status: "disabled", reason: "production_blocked" });
    assert.equal(browser.scripts.length, 0);
  } finally { browser.restore(); }
});

test("consent storage is versioned and does not alter first-party analytics state", () => {
  const browser = installBrowser();
  try {
    const state = saveConsent({ analytics: "unknown", advertising: "denied" }, browser.storage);
    assert.equal(state.version, 1);
    assert.equal(state.analytics, "unknown");
    assert.ok(browser.storage.getItem(CONSENT_STORAGE_KEY)?.includes('"advertising":"denied"'));
  } finally { browser.restore(); }
});
