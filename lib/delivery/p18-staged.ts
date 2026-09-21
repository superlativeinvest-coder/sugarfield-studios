import manifestJson from "@/assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260919-p16-v3-refresh.json";
import type { Entitlement } from "./types";

export const P18_STAGED_FULFILLMENT_VERSION = "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED";
export const P18_ENTITLEMENT_PRODUCT_ID = "P18";

export type P18StagedFile = {
  component: string;
  format: "US Letter" | "A4";
  sourceFamily: "P16-v2" | "P16-v3" | "P18-final" | "P13-v4.3" | "P13-approved-20260918";
  sourcePath: string;
  logicalDeliveryPath: string;
  bytes: number;
  sha256: string;
};

type P18StagedManifest = {
  status: "staged-not-deployed";
  componentCount: number;
  pdfCount: number;
  deliveryMapStatus: "staged-not-active";
  storageUploadStatus: "not-uploaded" | "uploaded-verified-staging";
  files: P18StagedFile[];
};

export const p18StagedManifest = manifestJson as P18StagedManifest;

export function validateP18StagedPackage(files: readonly P18StagedFile[] = p18StagedManifest.files): string[] {
  const errors: string[] = [];
  if (files.length !== 22) errors.push("P18 staged package must contain exactly 22 PDFs.");
  if (new Set(files.map((file) => file.sourcePath)).size !== files.length) errors.push("P18 staged package contains duplicate source paths.");
  if (new Set(files.map((file) => file.logicalDeliveryPath)).size !== files.length) errors.push("P18 staged package contains duplicate logical delivery paths.");
  if (new Set(files.map((file) => file.sha256)).size !== files.length) errors.push("P18 staged package contains duplicate SHA-256 hashes.");
  const canonicalBySourcePath = new Map(p18StagedManifest.files.map((file) => [file.sourcePath, file]));
  for (const file of files) {
    const canonical = canonicalBySourcePath.get(file.sourcePath);
    if (!canonical || canonical.component !== file.component || canonical.format !== file.format || canonical.sourceFamily !== file.sourceFamily || canonical.logicalDeliveryPath !== file.logicalDeliveryPath || canonical.bytes !== file.bytes || canonical.sha256 !== file.sha256) errors.push(`P18 staged package does not match the hash-locked manifest: ${file.sourcePath}`);
    if (!file.sourcePath.endsWith(".pdf") || !file.logicalDeliveryPath.endsWith(".pdf")) errors.push(`P18 staged package contains a non-PDF entry: ${file.sourcePath}`);
    if (!/^[A-F0-9]{64}$/.test(file.sha256)) errors.push(`P18 staged package has an invalid SHA-256: ${file.sourcePath}`);
    if (file.bytes <= 0) errors.push(`P18 staged package has an invalid byte size: ${file.sourcePath}`);
  }
  const componentFiles = new Map<string, P18StagedFile[]>();
  for (const file of files) componentFiles.set(file.component, [...(componentFiles.get(file.component) ?? []), file]);
  if (componentFiles.size !== 11) errors.push("P18 staged package must contain exactly 11 components.");
  for (const [component, pairedFiles] of componentFiles) {
    const formats = pairedFiles.map((file) => file.format);
    if (pairedFiles.length !== 2 || formats.filter((format) => format === "US Letter").length !== 1 || formats.filter((format) => format === "A4").length !== 1) errors.push(`P18 staged package requires one US Letter and one A4 PDF for ${component}.`);
  }
  return errors;
}

export function getStagedP18PackageFiles(): P18StagedFile[] {
  return p18StagedManifest.files.map((file) => ({ ...file }));
}

// This is deliberately separate from the active delivery provider. It allows
// tests to exercise one final-tier P18 entitlement without exposing files.
export function resolveStagedP18Entitlement(entitlement: Pick<Entitlement, "productId" | "fulfillmentVersion">): P18StagedFile[] {
  if (entitlement.productId !== P18_ENTITLEMENT_PRODUCT_ID || entitlement.fulfillmentVersion !== P18_STAGED_FULFILLMENT_VERSION) return [];
  return getStagedP18PackageFiles();
}
