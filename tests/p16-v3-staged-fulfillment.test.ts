import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getP16V3PackageFiles, P16_V3_FULFILLMENT_VERSION, validateP16V3Package } from "@/lib/delivery/p16-v3-staged";
import { getProductFilePaths } from "@/lib/delivery/service";

test("P16 V3 customer-delivery package contains six hash-locked Letter/A4 pairs", () => {
  const files = getP16V3PackageFiles();
  assert.deepEqual(validateP16V3Package(files), []);
  assert.equal(files.length, 12);
  assert.equal(new Set(files.map((file) => file.component)).size, 6);
  assert.equal(files.filter((file) => file.format === "US Letter").length, 6);
  assert.equal(files.filter((file) => file.format === "A4").length, 6);
  assert.equal(getProductFilePaths("P16", P16_V3_FULFILLMENT_VERSION).length, 12);
});

test("P16 V3 manifest matches every local delivery source byte-for-byte", () => {
  for (const file of getP16V3PackageFiles()) {
    const bytes = readFileSync(file.sourcePath);
    assert.equal(bytes.length, file.bytes, file.sourcePath);
    assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), file.sha256, file.sourcePath);
  }
});
