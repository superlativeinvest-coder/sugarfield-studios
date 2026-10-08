import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { P18_STAGED_FULFILLMENT_VERSION, getStagedP18PackageFiles, validateP18StagedPackage } from "@/lib/delivery/p18-staged";
import { P18_STORAGE_ROOT, planP18StorageStage, type P18RemoteState, type P18StorageVerificationRecord, type P18StorageVerificationReport } from "@/lib/delivery/p18-storage-staging";
import { artifactRootFromArgs, resolveArtifactSourcePath } from "@/scripts/lib/artifact-root";

const stagingEnvPath = join(process.cwd(), ".env.staging.local");
if (!existsSync(stagingEnvPath)) throw new Error("Missing .env.staging.local. Refusing to stage delivery assets.");
const stagingValues: Record<string, string> = {};
for (const line of readFileSync(stagingEnvPath, "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)=(.*)$/.exec(line);
  if (match) stagingValues[match[1]] = match[2].trim().replace(/^['\"]|['\"]$/g, "");
}
const execute = process.argv.includes("--execute");
const artifactRoot = artifactRootFromArgs();
const verify = process.argv.includes("--verify");
if (execute && verify) throw new Error("Choose either --verify or --execute, not both.");
const url = stagingValues.SUPABASE_URL;
const serviceRoleKey = stagingValues.SUPABASE_SERVICE_ROLE_KEY;
const bucket = stagingValues.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (
  stagingValues.POKOPIA_STAGING_ONLY !== "true"
  || url !== "https://faxsnbdjzniwyhtnsvfz.supabase.co"
  || !serviceRoleKey
) {
  throw new Error("P18 storage staging is restricted to the authorized staging Supabase project.");
}
const configuredUrl = url;
const configuredServiceRoleKey = serviceRoleKey;
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex").toUpperCase();
const tusMetadata = (value: string) => Buffer.from(value, "utf8").toString("base64");

async function uploadPrivatePdf(path: string, source: Buffer) {
  if (source.length <= 50 * 1024 * 1024) {
    const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.storage.from(bucket).upload(path, source, { contentType: "application/pdf", cacheControl: "private, max-age=0", upsert: false });
    if (error) throw new Error(`P18 upload failed for ${path}: ${error.message}`);
    return;
  }
  const create = await fetch(`${configuredUrl}/storage/v1/upload/resumable`, { method: "POST", headers: { authorization: `Bearer ${configuredServiceRoleKey}`, apikey: configuredServiceRoleKey, "tus-resumable": "1.0.0", "upload-length": String(source.length), "upload-metadata": `bucketName ${tusMetadata(bucket)},objectName ${tusMetadata(path)},contentType ${tusMetadata("application/pdf")},cacheControl ${tusMetadata("private, max-age=0")}`, "x-upsert": "false" } });
  const location = create.headers.get("location");
  if (!create.ok || !location) throw new Error(`P18 resumable upload initialization failed for ${path} (HTTP ${create.status}).`);
  const uploadUrl = new URL(location, configuredUrl).toString();
  const chunkBytes = 6 * 1024 * 1024;
  for (let offset = 0; offset < source.length;) {
    const chunk = source.subarray(offset, Math.min(offset + chunkBytes, source.length));
    const body = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
    const patch = await fetch(uploadUrl, { method: "PATCH", headers: { authorization: `Bearer ${configuredServiceRoleKey}`, apikey: configuredServiceRoleKey, "tus-resumable": "1.0.0", "upload-offset": String(offset), "content-type": "application/offset+octet-stream" }, body });
    const nextOffset = Number(patch.headers.get("upload-offset"));
    if (!patch.ok || !Number.isInteger(nextOffset) || nextOffset <= offset) throw new Error(`P18 resumable upload failed for ${path}.`);
    offset = nextOffset;
  }
}

async function main() {
  const manifestErrors = validateP18StagedPackage();
  if (manifestErrors.length) throw new Error(manifestErrors.join(" "));
  const files = getStagedP18PackageFiles();
  const local = await Promise.all(files.map(async (file) => {
    const bytes = await readFile(resolveArtifactSourcePath(file.sourcePath, artifactRoot));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error(`Local integrity mismatch: ${file.sourcePath}`);
    return [file.logicalDeliveryPath, bytes] as const;
  }));
  const localByPath = new Map(local);
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bucketInfo, error: bucketError } = await client.storage.getBucket(bucket);
  if (bucketError || !bucketInfo || bucketInfo.public) throw new Error("Configured P18 staging bucket is missing or public.");
  const remoteStates = new Map<string, P18RemoteState>();
  for (const file of files) {
    const { data, error } = await client.storage.from(bucket).download(file.logicalDeliveryPath, { cacheNonce: randomUUID() });
    if (error || !data) {
      if (error && !/not found|not exist|404/i.test(error.message)) throw new Error(`Could not inspect ${file.logicalDeliveryPath}: ${error.message}`);
      remoteStates.set(file.logicalDeliveryPath, "missing");
      continue;
    }
    const remote = Buffer.from(await data.arrayBuffer());
    remoteStates.set(file.logicalDeliveryPath, remote.length === file.bytes && sha256(remote) === file.sha256 ? "identical" : "collision");
  }
  const plan = planP18StorageStage(remoteStates, execute);
  if (plan.some((entry) => entry.remoteState === "collision")) throw new Error(`Refusing to overwrite a mismatched staged P18 object: ${plan.filter((entry) => entry.remoteState === "collision").map((entry) => entry.file.logicalDeliveryPath).join(", ")}`);
  if (!execute && !verify) { console.log(JSON.stringify({ mode: "dry-run", bucket, root: P18_STORAGE_ROOT, entries: plan, writes: 0 }, null, 2)); return; }
  if (verify && plan.some((entry) => entry.remoteState === "missing")) throw new Error("P18 verification will not upload missing objects. Run the approved staging operation before seeking delivery approval.");
  const records: P18StorageVerificationRecord[] = [];
  for (const entry of plan) {
    const source = localByPath.get(entry.file.logicalDeliveryPath)!;
    if (entry.remoteState === "missing" && execute) {
      await uploadPrivatePdf(entry.file.logicalDeliveryPath, source);
    }
    const { data: remoteBlob, error: remoteError } = await client.storage.from(bucket).download(entry.file.logicalDeliveryPath, { cacheNonce: randomUUID() });
    if (remoteError || !remoteBlob) throw new Error(`P18 remote verification failed for ${entry.file.logicalDeliveryPath}: ${remoteError?.message ?? "No object"}`);
    const remote = Buffer.from(await remoteBlob.arrayBuffer());
    if (remote.length !== entry.file.bytes || sha256(remote) !== entry.file.sha256 || !remote.equals(source)) throw new Error(`P18 remote bytes differ for ${entry.file.logicalDeliveryPath}.`);
    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(entry.file.logicalDeliveryPath, 3600, { cacheNonce: randomUUID() });
    if (signedError || !signed?.signedUrl) throw new Error(`P18 signed URL creation failed for ${entry.file.logicalDeliveryPath}.`);
    const signedResponse = await fetch(signed.signedUrl, { cache: "no-store" });
    const signedBytes = Buffer.from(await signedResponse.arrayBuffer());
    if (!signedResponse.ok || signedResponse.headers.get("content-type")?.split(";")[0] !== "application/pdf" || !signedBytes.equals(source) || sha256(signedBytes) !== entry.file.sha256) throw new Error(`P18 signed URL verification failed for ${entry.file.logicalDeliveryPath}.`);
    const anonymousResponse = await fetch(`${configuredUrl}/storage/v1/object/public/${bucket}/${entry.file.logicalDeliveryPath}`, { cache: "no-store" });
    records.push({ component: entry.file.component, format: entry.file.format, sourcePath: entry.file.sourcePath, remotePrivateObjectPath: entry.file.logicalDeliveryPath, bytes: entry.file.bytes, sha256: entry.file.sha256, uploadStatus: entry.remoteState === "identical" ? "reused-identical" : "uploaded", reusedIdentical: entry.remoteState === "identical", remoteVerified: true, signedUrlVerified: true, anonymousAccessDenied: !anonymousResponse.ok });
  }
  if (records.some((record) => !record.anonymousAccessDenied)) throw new Error("P18 anonymous-access verification failed.");
  const report: P18StorageVerificationReport = { packageVersion: P18_STAGED_FULFILLMENT_VERSION, bucket, generatedAt: new Date().toISOString(), records };
  const reports = join(process.cwd(), "assets", "fulfillment", "pokopia", "complete-player-system", "reports");
  await mkdir(reports, { recursive: true });
  await writeFile(join(reports, "p18-storage-verification-latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ mode: execute ? "execute" : "verify", bucket, root: P18_STORAGE_ROOT, uploaded: records.filter((record) => record.uploadStatus === "uploaded").length, reusedIdentical: records.filter((record) => record.reusedIdentical).length, verified: records.length, report: "assets/fulfillment/pokopia/complete-player-system/reports/p18-storage-verification-latest.json" }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P18 storage staging failed."); process.exitCode = 1; });
