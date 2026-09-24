import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLeadEmail, POKOPIA_START_NEXT_ROUTE } from "@/lib/pokopia-funnel/start";

test("Start lead emails are normalized and validated server-side", () => {
  assert.equal(normalizeLeadEmail("  Player@Example.COM "), "player@example.com");
  assert.equal(normalizeLeadEmail("not-an-email"), null);
  assert.equal(normalizeLeadEmail(""), null);
  assert.equal(normalizeLeadEmail(null), null);
});

test("Start submission has one server-owned next route", () => {
  assert.equal(POKOPIA_START_NEXT_ROUTE, "/pokopia/funnel/daily-reset");
});
