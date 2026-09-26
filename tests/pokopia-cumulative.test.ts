import test from "node:test";
import assert from "node:assert/strict";
import { addProductSelection, CANONICAL_SELECTION_ORDER, CHECKOUT_SCHEMA_VERSION, createCheckoutFingerprint, getCanonicalLineItems, getCheckoutDisplayLineItems, getSelectedTotalCents, normalizeSelectedProducts } from "@/lib/pokopia-funnel/cumulative";
import { emptyPokopiaJourney } from "@/lib/pokopia-funnel/journey";

test("canonical selections are deduplicated and ordered", () => {
  assert.deepEqual(CANONICAL_SELECTION_ORDER, ["P06", "P16", "P18", "P17"]);
  assert.deepEqual(normalizeSelectedProducts(["P17", "P06", "P06", "P16", "P13"]), ["P06", "P16", "P17"]);
});
test("accumulated totals use only canonical server prices", () => {
  assert.equal(getSelectedTotalCents(["P06", "P16", "P18"]), 4997);
  assert.equal(getSelectedTotalCents(["P06", "P16", "P17"]), 3997);
  assert.equal(getSelectedTotalCents(["P16", "P18"]), 4498);
  assert.equal(getSelectedTotalCents(["P06"]), 499);
  assert.deepEqual(getCanonicalLineItems(["P06", "P16", "P18"]).map((item) => item.productId), ["P06", "P16", "P18"]);
});

test("checkout display can include the free pack without changing the paid total", () => {
  const items = getCheckoutDisplayLineItems(["P06", "P16"], true);
  assert.deepEqual(items.map((item) => item.productId), ["FREE-QUICK-START", "P06", "P16"]);
  assert.equal(items[0].unitAmount, 0);
  assert.equal(getSelectedTotalCents(["P06", "P16"]), 2498);
});
test("repeated BUY is idempotent and SKIP has no removal primitive", () => {
  const once = addProductSelection(emptyPokopiaJourney("journey"), "P06");
  const repeated = addProductSelection(once, "P06");
  assert.deepEqual(repeated.selectedProducts, ["P06"]);
  assert.equal(repeated.currentTotalCents, 499);
});
test("checkout fingerprint is stable for the same canonical cart and changes with cart mutations", () => {
  const sameA = createCheckoutFingerprint("journey", ["P16", "P06"]);
  const sameB = createCheckoutFingerprint("journey", ["P06", "P16", "P06"]);
  assert.equal(sameA, sameB);
  assert.notEqual(sameA, createCheckoutFingerprint("journey", ["P06", "P16", "P18"]));
  assert.ok(CHECKOUT_SCHEMA_VERSION.includes("accumulated-order"));
});
