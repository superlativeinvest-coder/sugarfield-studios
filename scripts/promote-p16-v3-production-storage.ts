import { loadEnvConfig } from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getProductionP16PackageFiles, P16_PRODUCTION_FULFILLMENT_VERSION } from "@/lib/delivery/p16-production";
import { validateP16V3Package } from "@/lib/delivery/p16-v3-staged";
import { PRODUCTION_SUPABASE_PROJECT_REF, projectRefFromSupabaseUrl } from "@/lib/supabase/environment";
import { artifactRootFromArgs, resolveArtifactSourcePath } from "@/scripts/lib/artifact-root";

loadEnvConfig(process.cwd());
const execute = process.argv.includes("--execute");
const artifactRoot = artifactRootFromArgs();
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey || projectRefFromSupabaseUrl(url) !== PRODUCTION_SUPABASE_PROJECT_REF) throw new Error("P16 production promotion requires the approved production Supabase project.");
if (execute && process.env.POKOPIA_PRODUCTION_STORAGE_PROMOTION_ENABLED !== "true") throw new Error("Set POKOPIA_PRODUCTION_STORAGE_PROMOTION_ENABLED=true for an explicit production write.");
if (execute && !artifactRoot) throw new Error("Production promotion requires --artifact-root (or POKOPIA_ARTIFACT_ROOT).");

const configuredUrl = url;
const configuredServiceRoleKey = serviceRoleKey;
const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex").toUpperCase();
const metadata = (value: string) => Buffer.from(value, "utf8").toString("base64");
type PromotionRecord = { path: string; bytes: number; sha256: string; disposition: "missing" | "uploaded" | "reused-identical"; private?: true; signedRetrievalVerified?: true };

async function uploadWithoutOverwrite(path: string, source: Buffer) {
  if (source.length <= 50 * 1024 * 1024) {
    const { error } = await client.storage.from(bucket).upload(path, source, { contentType: "application/pdf", cacheControl: "private, max-age=0", upsert: false });
    if (error) throw new Error(`P16 production upload failed for ${path}: ${error.message}`);
    return;
  }
  const create = await fetch(`${configuredUrl}/storage/v1/upload/resumable`, { method: "POST", headers: { authorization: `Bearer ${configuredServiceRoleKey}`, apikey: configuredServiceRoleKey, "tus-resumable": "1.0.0", "upload-length": String(source.length), "upload-metadata": `bucketName ${metadata(bucket)},objectName ${metadata(path)},contentType ${metadata("application/pdf")},cacheControl ${metadata("private, max-age=0")}`, "x-upsert": "false" } });
  const location = create.headers.get("location");
  if (!create.ok || !location) throw new Error(`P16 production resumable upload initialization failed for ${path} (HTTP ${create.status}).`);
  const uploadUrl = new URL(location, configuredUrl).toString();
  for (let offset = 0; offset < source.length;) {
    const chunk = source.subarray(offset, Math.min(offset + 6 * 1024 * 1024, source.length));
    const response = await fetch(uploadUrl, { method: "PATCH", headers: { authorization: `Bearer ${configuredServiceRoleKey}`, apikey: configuredServiceRoleKey, "tus-resumable": "1.0.0", "upload-offset": String(offset), "content-type": "application/offset+octet-stream" }, body: chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer });
    const nextOffset = Number(response.headers.get("upload-offset"));
    if (!response.ok || !Number.isInteger(nextOffset) || nextOffset <= offset) throw new Error(`P16 production resumable upload failed for ${path}.`);
    offset = nextOffset;
  }
}

async function main() {
  const manifestErrors = validateP16V3Package();
  if (manifestErrors.length) throw new Error(manifestErrors.join(" "));
  const { data: bucketInfo, error: bucketError } = await client.storage.getBucket(bucket);
  if (bucketError || !bucketInfo || bucketInfo.public) throw new Error("Production delivery bucket is missing or public.");
  const files = getProductionP16PackageFiles();
  const records: PromotionRecord[] = [];
  for (const file of files) {
    const source = await readFile(resolveArtifactSourcePath(file.sourcePath, artifactRoot));
    if (source.length !== file.bytes || sha256(source) !== file.sha256) throw new Error(`Local artifact integrity mismatch: ${file.sourcePath}`);
    const before = await client.storage.from(bucket).download(file.logicalDeliveryPath, { cacheNonce: randomUUID() });
    let disposition: "missing" | "reused-identical" = "missing";
    if (before.data) {
      const remote = Buffer.from(await before.data.arrayBuffer());
      if (remote.length !== file.bytes || sha256(remote) !== file.sha256 || !remote.equals(source)) throw new Error(`Refusing to overwrite non-identical production object: ${file.logicalDeliveryPath}`);
      disposition = "reused-identical";
    } else if (before.error && !/not found|not exist|404/i.test(before.error.message)) throw new Error(`Could not inspect ${file.logicalDeliveryPath}: ${before.error.message}`);
    if (execute && disposition === "missing") await uploadWithoutOverwrite(file.logicalDeliveryPath, source);
    if (!execute) { records.push({ path: file.logicalDeliveryPath, bytes: file.bytes, sha256: file.sha256, disposition }); continue; }
    const verified = await client.storage.from(bucket).download(file.logicalDeliveryPath, { cacheNonce: randomUUID() });
    if (verified.error || !verified.data) throw new Error(`Production object verification failed: ${file.logicalDeliveryPath}`);
    const remote = Buffer.from(await verified.data.arrayBuffer());
    if (remote.length !== file.bytes || sha256(remote) !== file.sha256 || !remote.equals(source)) throw new Error(`Production object bytes differ: ${file.logicalDeliveryPath}`);
    const signed = await client.storage.from(bucket).createSignedUrl(file.logicalDeliveryPath, 300, { cacheNonce: randomUUID() });
    if (signed.error || !signed.data?.signedUrl) throw new Error(`Signed URL creation failed: ${file.logicalDeliveryPath}`);
    const signedResponse = await fetch(signed.data.signedUrl, { cache: "no-store" });
    const signedBytes = Buffer.from(await signedResponse.arrayBuffer());
    if (!signedResponse.ok || signedBytes.length !== file.bytes || sha256(signedBytes) !== file.sha256) throw new Error(`Fresh signed retrieval failed: ${file.logicalDeliveryPath}`);
    const anonymous = await fetch(`${configuredUrl}/storage/v1/object/public/${bucket}/${file.logicalDeliveryPath}`, { cache: "no-store" });
    if (anonymous.ok) throw new Error(`Production object is publicly accessible: ${file.logicalDeliveryPath}`);
    records.push({ path: file.logicalDeliveryPath, bytes: file.bytes, sha256: file.sha256, disposition: disposition === "missing" ? "uploaded" : disposition, private: true, signedRetrievalVerified: true });
  }
  const report = { mode: execute ? "execute" : "dry-run", packageVersion: P16_PRODUCTION_FULFILLMENT_VERSION, bucket, generatedAt: new Date().toISOString(), writes: execute ? records.filter((record) => record.disposition === "uploaded").length : 0, records };
  if (execute) {
    const reports = join(process.cwd(), "assets", "fulfillment", "pokopia", "adventure-companion", "reports");
    await mkdir(reports, { recursive: true });
    await writeFile(join(reports, "p16-v3-production-storage-verification-latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 production promotion failed."); process.exitCode = 1; });
