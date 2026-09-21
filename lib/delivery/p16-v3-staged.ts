import manifestJson from "@/assets/fulfillment/pokopia/adventure-companion/p16-v3-customer-delivery-manifest-20260919.json";

export const P16_V3_FULFILLMENT_VERSION = "P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED";

export type P16V3File = {
  component: string;
  format: "US Letter" | "A4";
  sourcePath: string;
  logicalDeliveryPath: string;
  bytes: number;
  sha256: string;
};

type P16V3Manifest = {
  status: "staged-not-deployed";
  packageVersion: typeof P16_V3_FULFILLMENT_VERSION;
  componentCount: number;
  pdfCount: number;
  files: P16V3File[];
};

export const p16V3Manifest = manifestJson as P16V3Manifest;

export function validateP16V3Package(files: readonly P16V3File[] = p16V3Manifest.files): string[] {
  const errors: string[] = [];
  if (p16V3Manifest.packageVersion !== P16_V3_FULFILLMENT_VERSION) errors.push("P16 V3 manifest version is not the staged customer-delivery version.");
  if (files.length !== 12) errors.push("P16 V3 package must contain exactly 12 PDFs.");
  if (new Set(files.map((file) => file.sourcePath)).size !== files.length) errors.push("P16 V3 package contains duplicate source paths.");
  if (new Set(files.map((file) => file.logicalDeliveryPath)).size !== files.length) errors.push("P16 V3 package contains duplicate logical delivery paths.");
  if (new Set(files.map((file) => file.sha256)).size !== files.length) errors.push("P16 V3 package contains duplicate SHA-256 hashes.");
  const canonicalBySource = new Map(p16V3Manifest.files.map((file) => [file.sourcePath, file]));
  const byComponent = new Map<string, P16V3File[]>();
  for (const file of files) {
    const canonical = canonicalBySource.get(file.sourcePath);
    if (!canonical || canonical.component !== file.component || canonical.format !== file.format || canonical.logicalDeliveryPath !== file.logicalDeliveryPath || canonical.bytes !== file.bytes || canonical.sha256 !== file.sha256) errors.push(`P16 V3 package does not match its hash-locked manifest: ${file.sourcePath}`);
    if (!file.sourcePath.endsWith(".pdf") || !file.logicalDeliveryPath.endsWith(".pdf")) errors.push(`P16 V3 package contains a non-PDF entry: ${file.sourcePath}`);
    if (file.bytes <= 0 || !/^[A-F0-9]{64}$/.test(file.sha256)) errors.push(`P16 V3 package contains invalid integrity metadata: ${file.sourcePath}`);
    byComponent.set(file.component, [...(byComponent.get(file.component) ?? []), file]);
  }
  if (byComponent.size !== 6) errors.push("P16 V3 package must contain exactly six components.");
  for (const [component, pairedFiles] of byComponent) {
    if (pairedFiles.length !== 2 || pairedFiles.filter((file) => file.format === "US Letter").length !== 1 || pairedFiles.filter((file) => file.format === "A4").length !== 1) errors.push(`P16 V3 requires one US Letter and one A4 PDF for ${component}.`);
  }
  return errors;
}

export function getP16V3PackageFiles(): P16V3File[] {
  return p16V3Manifest.files.map((file) => ({ ...file }));
}
