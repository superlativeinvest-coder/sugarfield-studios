import test from "node:test";
import assert from "node:assert/strict";
import { getP16V3PackageFiles, P16_V3_FULFILLMENT_VERSION } from "@/lib/delivery/p16-v3-staged";
import { P16_V3_STORAGE_ROOT, planP16V3StorageStage, validateP16V3StorageVerificationReport } from "@/lib/delivery/p16-storage-staging";

test("P16 V3 staging dry-run plans all versioned private paths without writes", () => {
  const plan = planP16V3StorageStage(new Map());
  assert.equal(plan.length, 12);
  assert.equal(plan.every((entry) => entry.uploadStatus === "dry-run"), true);
  assert.equal(plan.every((entry) => entry.file.logicalDeliveryPath.startsWith(P16_V3_STORAGE_ROOT)), true);
});

test("P16 V3 staging reuses identical objects and fails closed on collisions", () => {
  const files = getP16V3PackageFiles();
  const plan = planP16V3StorageStage(new Map([[files[0].logicalDeliveryPath, "identical"], [files[1].logicalDeliveryPath, "collision"]]), true);
  assert.equal(plan[0].uploadStatus, "reused-identical");
  assert.equal(plan[1].uploadStatus, "collision");
  assert.equal(plan.filter((entry) => entry.uploadStatus === "pending-upload").length, 10);
});

test("P16 V3 report requires private byte and signed-URL verification", () => {
  const records = getP16V3PackageFiles().map((file) => ({ component: file.component, format: file.format, sourcePath: file.sourcePath, remotePrivateObjectPath: file.logicalDeliveryPath, bytes: file.bytes, sha256: file.sha256, uploadStatus: "uploaded" as const, reusedIdentical: false, remoteVerified: true, signedUrlVerified: true, anonymousAccessDenied: true }));
  assert.deepEqual(validateP16V3StorageVerificationReport({ packageVersion: P16_V3_FULFILLMENT_VERSION, bucket: "digital-products", generatedAt: "2026-09-19T00:00:00.000Z", records }), []);
  assert.ok(validateP16V3StorageVerificationReport({ packageVersion: P16_V3_FULFILLMENT_VERSION, bucket: "digital-products", generatedAt: "2026-09-19T00:00:00.000Z", records: [{ ...records[0], signedUrl: "must-not-persist" } as never, ...records.slice(1)] }).length > 0);
});
