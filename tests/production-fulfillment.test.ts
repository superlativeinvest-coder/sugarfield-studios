import test from "node:test";
import assert from "node:assert/strict";
import { getActiveFulfillmentVersions } from "@/lib/delivery/fulfillment-environment";
import { getProductionP16PackageFiles, P16_PRODUCTION_FULFILLMENT_VERSION } from "@/lib/delivery/p16-production";
import { P18_PRODUCTION_FULFILLMENT_VERSION } from "@/lib/delivery/p18-production";
import { getProductFilePaths } from "@/lib/delivery/service";
import { P17_APPROVED_FILES, P17_APPROVED_P04_SHA256 } from "@/lib/delivery/p17-approved";

test("production selects immutable P16 and P18 production fulfillment versions", () => {
  const versions = getActiveFulfillmentVersions({ SUPABASE_URL: "https://lbbxdvszykxdaytqmqnl.supabase.co", STRIPE_SECRET_KEY: "sk_live_example" });
  assert.deepEqual(versions, { environment: "PRODUCTION", p16: P16_PRODUCTION_FULFILLMENT_VERSION, p18: P18_PRODUCTION_FULFILLMENT_VERSION });
  assert.equal(getProductFilePaths("P16", versions!.p16).length, 12);
  assert.equal(getProductFilePaths("P18", versions!.p18).length, 22);
  assert.equal(getProductionP16PackageFiles().every((file) => !file.logicalDeliveryPath.includes("_STAGED")), true);
});

test("P17 remains the approved four-file package with the final-v2 P04 object", () => {
  const files = getProductFilePaths("P17");
  assert.equal(files.length, 4);
  assert.equal(files[2], "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf");
  assert.equal(P17_APPROVED_FILES[2].sha256, P17_APPROVED_P04_SHA256);
  assert.equal(P17_APPROVED_P04_SHA256, "FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB");
});
