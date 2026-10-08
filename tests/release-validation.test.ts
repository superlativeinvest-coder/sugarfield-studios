import test from "node:test";
import assert from "node:assert/strict";
import { isReleaseGateExemptPath, normalizeValidationHost, releaseValidationCookieValue, requestHost, sha256Hex, timingSafeTextEqual } from "@/lib/release-validation";

test("validation host and token cookie checks are exact and deterministic", async () => {
  assert.equal(normalizeValidationHost("Validate.CozyGamesGuides.com:443"), "validate.cozygamesguides.com");
  assert.equal(normalizeValidationHost("https://validate.example.com"), null);
  assert.equal(requestHost(new Headers({ "x-forwarded-host": "validate.example.com:443" })), "validate.example.com");
  const hash = await sha256Hex("a sufficiently long release token");
  const cookie = await releaseValidationCookieValue(hash, "validate.example.com");
  assert.equal(cookie.length, 64);
  assert.equal(timingSafeTextEqual(cookie, cookie), true);
  assert.equal(timingSafeTextEqual(cookie, `${cookie.slice(0, -1)}0`), cookie.endsWith("0"));
});

test("release gate exempts only rollout infrastructure and static assets", () => {
  assert.equal(isReleaseGateExemptPath("/api/stripe/webhook"), true);
  assert.equal(isReleaseGateExemptPath("/auth/callback"), true);
  assert.equal(isReleaseGateExemptPath("/assets/logo.png"), true);
  assert.equal(isReleaseGateExemptPath("/pokopia/start"), false);
  assert.equal(isReleaseGateExemptPath("/api/pokopia/funnel/checkout"), false);
});
