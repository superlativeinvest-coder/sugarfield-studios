import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONSENT_STORAGE_KEY, readConsent, saveConsent } from "@/lib/privacy/consent";
import { dispatchTikTokEvent, getTikTokPixelConfig, initializeTikTokPixel } from "@/lib/analytics/tiktok-pixel";

const consentSource = readFileSync("components/privacy/ConsentBanner.tsx", "utf8");
const starterSource = readFileSync("components/pokopia/PokopiaStarterStage.tsx", "utf8");

test("consent panel is non-modal and keeps both decisions explicit", () => {
  assert.match(consentSource, /role="region"/);
  assert.doesNotMatch(consentSource, /role="dialog"/);
  assert.match(consentSource, /setAdvertisingConsent\("denied"\)/);
  assert.match(consentSource, /setAdvertisingConsent\("granted"\)/);
  assert.match(consentSource, /consent-control--panel/);
});

test("Quick Start exposes one signup alert and one separate access alert", () => {
  const signupAlerts = starterSource.match(/\{status && <p className="focused-funnel__status" role="alert">\{status\}<\/p>\}/g) ?? [];
  const accessAlerts = starterSource.match(/\{authStatus && <p className="focused-funnel__status" role="alert">\{authStatus\}<\/p>\}/g) ?? [];
  assert.equal(signupAlerts.length, 1);
  assert.equal(accessAlerts.length, 1);
});

test("advertising consent remains fail-closed until affirmative consent", () => {
  const storage = new Map<string, string>();
  const browser = globalThis as unknown as { window?: unknown; document?: unknown };
  const previousWindow = browser.window;
  const previousDocument = browser.document;
  const scripts: unknown[] = [];
  const localStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) };
  browser.window = { localStorage, ttq: undefined, __sugarfieldTikTokPixel: undefined, dispatchEvent: () => true };
  browser.document = { scripts, createElement: () => ({ setAttribute() {}, getAttribute() { return null; }, onload: null, onerror: null }), head: { appendChild: (script: unknown) => scripts.push(script) } };
  try {
    const config = getTikTokPixelConfig({ NEXT_PUBLIC_TIKTOK_PIXEL_ID: "production-id", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NODE_ENV: "production" });
    assert.deepEqual(initializeTikTokPixel(config), { status: "disabled", reason: "consent_required" });
    saveConsent({ analytics: "unknown", advertising: "denied" }, localStorage);
    assert.deepEqual(initializeTikTokPixel(config), { status: "disabled", reason: "consent_required" });
    assert.notEqual(dispatchTikTokEvent({ eventName: "p06_viewed", productId: "P06" }, "00000000-0000-4000-8000-000000000211", config), "dispatched");
    saveConsent({ analytics: "unknown", advertising: "granted" }, localStorage);
    assert.equal(initializeTikTokPixel(config).status, "initialized");
    assert.ok(storage.get(CONSENT_STORAGE_KEY)?.includes('"advertising":"granted"'));
    assert.equal(readConsent(localStorage)?.advertising, "granted");
  } finally {
    if (previousWindow === undefined) delete browser.window; else browser.window = previousWindow;
    if (previousDocument === undefined) delete browser.document; else browser.document = previousDocument;
  }
});
