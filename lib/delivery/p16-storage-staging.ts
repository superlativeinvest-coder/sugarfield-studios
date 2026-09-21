import { getP16V3PackageFiles, P16_V3_FULFILLMENT_VERSION, type P16V3File, validateP16V3Package } from "./p16-v3-staged";

export const P16_V3_STORAGE_ROOT = "pokopia/p16-adventure-companion/P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED/";
export type P16V3RemoteState = "missing" | "identical" | "collision";
export type P16V3StagePlan = { file: P16V3File; remoteState: P16V3RemoteState; uploadStatus: "dry-run" | "reused-identical" | "pending-upload" | "collision" };
export type P16V3StorageVerificationRecord = {
  component: string;
  format: "US Letter" | "A4";
  sourcePath: string;
  remotePrivateObjectPath: string;
  bytes: number;
  sha256: string;
  uploadStatus: "uploaded" | "reused-identical";
  reusedIdentical: boolean;
  remoteVerified: boolean;
  signedUrlVerified: boolean;
  anonymousAccessDenied: boolean;
};
export type P16V3StorageVerificationReport = {
  packageVersion: typeof P16_V3_FULFILLMENT_VERSION;
  bucket: string;
  generatedAt: string;
  records: P16V3StorageVerificationRecord[];
};

export function planP16V3StorageStage(remoteStates: ReadonlyMap<string, P16V3RemoteState>, execute = false): P16V3StagePlan[] {
  const errors = validateP16V3Package();
  if (errors.length) throw new Error(errors.join(" "));
  return getP16V3PackageFiles().map((file) => {
    if (!file.logicalDeliveryPath.startsWith(P16_V3_STORAGE_ROOT)) throw new Error(`P16 V3 manifest path is outside the staged root: ${file.logicalDeliveryPath}`);
    const remoteState = remoteStates.get(file.logicalDeliveryPath) ?? "missing";
    return { file, remoteState, uploadStatus: remoteState === "collision" ? "collision" : remoteState === "identical" ? "reused-identical" : execute ? "pending-upload" : "dry-run" };
  });
}

export function validateP16V3StorageVerificationReport(report: P16V3StorageVerificationReport): string[] {
  const errors: string[] = [];
  if (report.packageVersion !== P16_V3_FULFILLMENT_VERSION || report.records.length !== 12) errors.push("P16 V3 storage report must contain the complete staged package.");
  if (new Set(report.records.map((record) => record.remotePrivateObjectPath)).size !== report.records.length) errors.push("P16 V3 storage report contains duplicate remote paths.");
  if (/"signedUrl"\s*:/.test(JSON.stringify(report))) errors.push("P16 V3 storage report must not persist signed URLs.");
  for (const record of report.records) if (!record.remoteVerified || !record.signedUrlVerified || !record.anonymousAccessDenied) errors.push(`P16 V3 storage report has an incomplete verification: ${record.remotePrivateObjectPath}`);
  return errors;
}
