import test from "node:test";
import assert from "node:assert/strict";
import { getStagedP18PackageFiles } from "@/lib/delivery/p18-staged";
import { P18_STAGED_FULFILLMENT_VERSION } from "@/lib/delivery/p18-staged";
import { P18_STORAGE_ROOT, planP18StorageStage, validateP18StorageVerificationReport } from "@/lib/delivery/p18-storage-staging";

test("P18 storage dry-run plans all manifest paths without permitting uploads", () => {
  const plan = planP18StorageStage(new Map());
  assert.equal(plan.length, 22);
  assert.equal(plan.every((entry) => entry.uploadStatus === "dry-run"), true);
  assert.equal(plan.every((entry) => entry.file.logicalDeliveryPath.startsWith(P18_STORAGE_ROOT)), true);
});

test("P18 storage plan reuses byte-identical objects and fails closed on collisions", () => {
  const files = getStagedP18PackageFiles();
  const plan = planP18StorageStage(new Map([[files[0].logicalDeliveryPath, "identical"], [files[1].logicalDeliveryPath, "collision"]]), true);
  assert.equal(plan[0].uploadStatus, "reused-identical");
  assert.equal(plan[1].uploadStatus, "collision");
  assert.equal(plan.filter((entry) => entry.uploadStatus === "pending-upload").length, 20);
});

test("P18 storage report is complete and never persists signed URLs", () => {
  const records = getStagedP18PackageFiles().map((file) => ({ component: file.component, format: file.format, sourcePath: file.sourcePath, remotePrivateObjectPath: file.logicalDeliveryPath, bytes: file.bytes, sha256: file.sha256, uploadStatus: "uploaded" as const, reusedIdentical: false, remoteVerified: true, signedUrlVerified: true, anonymousAccessDenied: true }));
  assert.deepEqual(validateP18StorageVerificationReport({ packageVersion: P18_STAGED_FULFILLMENT_VERSION, bucket: "digital-products", generatedAt: "2026-09-13T00:00:00.000Z", records }), []);
  assert.ok(validateP18StorageVerificationReport({ packageVersion: P18_STAGED_FULFILLMENT_VERSION, bucket: "digital-products", generatedAt: "2026-09-13T00:00:00.000Z", records: [{ ...records[0], signedUrl: "must-not-persist" } as never, ...records.slice(1)] }).length > 0);
});
