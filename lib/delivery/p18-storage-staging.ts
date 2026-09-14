import { getStagedP18PackageFiles, type P18StagedFile, validateP18StagedPackage } from "./p18-staged";

export const P18_STORAGE_ROOT = "pokopia/p18-complete-player-system/P18_V1_24_99_STAGED/";
export type P18RemoteState = "missing" | "identical" | "collision";
export type P18StagePlan = { file: P18StagedFile; remoteState: P18RemoteState; uploadStatus: "dry-run" | "reused-identical" | "pending-upload" | "collision" };
export type P18StorageVerificationRecord = {
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
export type P18StorageVerificationReport = {
  packageVersion: "P18_V1_24_99_STAGED";
  bucket: string;
  generatedAt: string;
  records: P18StorageVerificationRecord[];
};

export function planP18StorageStage(remoteStates: ReadonlyMap<string, P18RemoteState>, execute = false): P18StagePlan[] {
  const errors = validateP18StagedPackage();
  if (errors.length) throw new Error(errors.join(" "));
  return getStagedP18PackageFiles().map((file) => {
    if (!file.logicalDeliveryPath.startsWith(P18_STORAGE_ROOT)) throw new Error(`P18 manifest path is outside the staged root: ${file.logicalDeliveryPath}`);
    const remoteState = remoteStates.get(file.logicalDeliveryPath) ?? "missing";
    return {
      file,
      remoteState,
      uploadStatus: remoteState === "collision" ? "collision" : remoteState === "identical" ? "reused-identical" : execute ? "pending-upload" : "dry-run",
    };
  });
}

export function validateP18StorageVerificationReport(report: P18StorageVerificationReport): string[] {
  const errors: string[] = [];
  if (report.packageVersion !== "P18_V1_24_99_STAGED" || report.records.length !== 22) errors.push("P18 storage report must contain the complete staged package.");
  if (new Set(report.records.map((record) => record.remotePrivateObjectPath)).size !== report.records.length) errors.push("P18 storage report contains duplicate remote paths.");
  if (/"signedUrl"\s*:/.test(JSON.stringify(report))) errors.push("P18 storage report must not persist signed URLs.");
  for (const record of report.records) if (!record.remoteVerified || !record.signedUrlVerified || !record.anonymousAccessDenied) errors.push(`P18 storage report has an incomplete verification: ${record.remotePrivateObjectPath}`);
  return errors;
}
