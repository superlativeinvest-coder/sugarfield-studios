import test from "node:test";
import assert from "node:assert/strict";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { products } from "@/lib/catalog/data";
import { validateCheckoutRequest } from "@/lib/commerce/checkout";

test("active paid funnel offers use literal BUY and SKIP CTAs", () => {
  for (const offer of [pokopiaFunnelOffers.dailyReset, pokopiaFunnelOffers.companion, pokopiaFunnelOffers.completePlayerSystem, pokopiaFunnelOffers.completionistKit]) {
    assert.equal(offer.cta, "BUY");
    assert.equal(offer.skipCta, "SKIP");
  }
});
test("P13 remains a standalone product and is not a funnel offer", () => {
  assert.equal("miniTool" in pokopiaFunnelOffers, false);
  assert.equal(products.find((product) => product.id === "P13")?.id, "P13");
  assert.equal(validateCheckoutRequest({ productId: "P13" })?.productId, "P13");
});
