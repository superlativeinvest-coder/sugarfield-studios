import assert from "node:assert/strict";
import test from "node:test";
import {
  ANONYMOUS_ID_COOKIE,
  captureAttribution,
  ensureAnonymousId,
  getAnonymousIdFromCookieHeader,
  readStoredAttribution,
} from "@/lib/attribution/capture";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("TikTok attribution normalizes content_id and ttclid", () => {
  const local = new MemoryStorage();
  const state = captureAttribution("?utm_source=tiktok&utm_medium=organic&utm_campaign=pokopia_test&utm_content=TT_TEST_001&utm_term=reset&ttclid=synthetic-123", local, undefined, { landingPage: "/pokopia/start", referrer: "https://example.test/video" });
  assert.equal(state.firstTouch.utm_source, "tiktok");
  assert.equal(state.firstTouch.utm_content, "TT_TEST_001");
  assert.equal(state.firstTouch.content_id, "TT_TEST_001");
  assert.equal(state.firstTouch.ttclid, "synthetic-123");
  assert.equal(state.firstTouch.landing_page, "/pokopia/start");
  assert.equal(state.firstTouch.referrer, "https://example.test/video");
});

test("first touch persists while recognized later attribution updates current touch", () => {
  const local = new MemoryStorage();
  const first = captureAttribution("?utm_source=tiktok&utm_medium=organic&utm_campaign=first&utm_content=TT_001", local, undefined, { landingPage: "/pokopia/start" });
  const later = captureAttribution("?utm_source=newsletter&utm_medium=email&utm_campaign=second", local, undefined, { landingPage: "/pokopia/daily-reset" });
  const untagged = captureAttribution("", local, undefined, { landingPage: "/pokopia/companion" });
  assert.equal(first.firstTouch.utm_campaign, "first");
  assert.equal(later.firstTouch.utm_campaign, "first");
  assert.equal(later.currentTouch.utm_campaign, "second");
  assert.equal(untagged.currentTouch.utm_campaign, "second");
});

test("untagged first traffic is documented direct attribution", () => {
  const local = new MemoryStorage();
  const state = captureAttribution("", local, undefined, { landingPage: "/pokopia/start", referrer: "https://search.example/" });
  assert.equal(state.firstTouch.utm_source, "direct");
  assert.equal(state.firstTouch.utm_medium, "none");
  assert.equal(state.currentTouch.utm_source, "direct");
  assert.equal(state.firstTouch.landing_page, "/pokopia/start");
});

test("legacy sessionStorage state migrates into the canonical localStorage state", () => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  session.setItem("sugarfield_attribution", JSON.stringify({ firstTouch: { source: "tiktok", content: "TT_002" }, currentTouch: { source: "tiktok", content: "TT_002" } }));
  const state = readStoredAttribution(local, session);
  assert.equal(state?.firstTouch.utm_source, "tiktok");
  assert.equal(state?.firstTouch.content_id, "TT_002");
  assert.equal(local.getItem("sugarfield_attribution") !== null, true);
  assert.equal(session.getItem("sugarfield_attribution"), null);
});

test("anonymous ID is a random UUID cookie and is reused when valid", () => {
  let written = "";
  const created = ensureAnonymousId("", (value) => { written = value; });
  assert.match(created, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(written, created);
  assert.equal(getAnonymousIdFromCookieHeader(`${ANONYMOUS_ID_COOKIE}=${created}`), created);
  assert.equal(ensureAnonymousId(`${ANONYMOUS_ID_COOKIE}=${created}`, () => { throw new Error("must not replace valid ID"); }), created);
  assert.equal(getAnonymousIdFromCookieHeader(`${ANONYMOUS_ID_COOKIE}=email@example.com`), undefined);
});
