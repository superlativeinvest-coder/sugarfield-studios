import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getStagedP18PackageFiles, P18_ENTITLEMENT_PRODUCT_ID, P18_STAGED_FULFILLMENT_VERSION, resolveStagedP18Entitlement, validateP18StagedPackage } from "@/lib/delivery/p18-staged";
import { getProductFilePaths } from "@/lib/delivery/service";

test("P18 staged package resolves exactly one hash-locked Letter/A4 pair per component", () => {
  const files = resolveStagedP18Entitlement({ productId: P18_ENTITLEMENT_PRODUCT_ID, fulfillmentVersion: P18_STAGED_FULFILLMENT_VERSION });
  assert.deepEqual(validateP18StagedPackage(files), []);
  assert.equal(files.length, 22);
  assert.equal(files.filter((file) => file.format === "US Letter").length, 11);
  assert.equal(files.filter((file) => file.format === "A4").length, 11);
  assert.equal(new Set(files.map((file) => file.component)).size, 11);
  assert.equal(new Set(files.map((file) => file.sha256)).size, 22);
  assert.equal(files.filter((file) => file.sourceFamily === "P16-v2").length, 6);
  assert.equal(files.filter((file) => file.sourceFamily === "P16-v3").length, 6);
  assert.equal(files.filter((file) => file.sourceFamily === "P18-final").length, 10);
  const eventTracker = files.filter((file) => file.component === "Event Tracker");
  assert.equal(eventTracker.length, 2);
  assert.equal(eventTracker.every((file) => file.sourceFamily === "P16-v3"), true);
  assert.deepEqual(resolveStagedP18Entitlement({ productId: "P16", fulfillmentVersion: P18_STAGED_FULFILLMENT_VERSION }), []);
  assert.deepEqual(getProductFilePaths("P18"), []);
  assert.equal(getProductFilePaths("P18", P18_STAGED_FULFILLMENT_VERSION).length, 22);
});

test("P18 staged package fails closed for missing entries and SHA mismatches", () => {
  const files = getStagedP18PackageFiles();
  assert.ok(validateP18StagedPackage(files.slice(1)).length > 0);
  assert.ok(validateP18StagedPackage([{ ...files[0], sha256: "0".repeat(64) }, ...files.slice(1)]).length > 0);
});

test("P18 staged manifest matches every approved source byte-for-byte", () => {
  for (const file of getStagedP18PackageFiles()) {
    const bytes = readFileSync(file.sourcePath);
    assert.equal(bytes.length, file.bytes, file.sourcePath);
    assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), file.sha256, file.sourcePath);
  }
});
