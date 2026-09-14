import { loadEnvConfig } from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const storageUrl = url;
const storageKey = serviceRoleKey;

const sourcePath = "PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-letter-optimized-candidate.pdf";
const previousPath = "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf";
const tempPath = `_temp/p14-byte-test-letter-${randomUUID()}.pdf`;
const localCopyPath = "tmp/pdfs/p14-v2-optimization/local-letter-binary-control-copy.pdf";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const summarizeHeaders = (headers: Headers) => Object.fromEntries(["content-type", "content-length", "content-encoding", "etag", "last-modified", "cache-control", "age", "x-cache"].map((name) => [name, headers.get(name)]));
const client = createClient(storageUrl, storageKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function sdkDownload(path: string) {
  const { data, error } = await client.storage.from(bucket).download(path, { cacheNonce: randomUUID() });
  if (error || !data) throw new Error(`SDK download failed: ${error?.message ?? "no object returned"}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, size: bytes.length, sha256: hash(bytes), contentType: data.type || null };
}

async function rawDownload(path: string) {
  const safePath = `${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(`${storageUrl}/storage/v1/object/authenticated/${safePath}?cacheNonce=${randomUUID()}`, {
    headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Raw download failed: ${response.status} ${await response.text()}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, size: bytes.length, sha256: hash(bytes), headers: summarizeHeaders(response.headers) };
}

async function main() {
  const source = await readFile(sourcePath);
  await writeFile(localCopyPath, source);
  const localCopy = await readFile(localCopyPath);
  const local = { source: { size: source.length, sha256: hash(source), first32Hex: source.subarray(0, 32).toString("hex") }, copy: { size: localCopy.length, sha256: hash(localCopy), equal: source.equals(localCopy) } };
  if (!source.equals(localCopy)) throw new Error("Local binary control failed.");

  // This first write uses only a new private diagnostic object. It never targets a customer-delivery path.
  const firstUpload = await client.storage.from(bucket).upload(tempPath, source, { contentType: "application/pdf", upsert: true, cacheControl: "0" });
  if (firstUpload.error) throw new Error(`Initial diagnostic upload failed: ${firstUpload.error.message}`);
  const freshSdk = await sdkDownload(tempPath);
  const freshRaw = await rawDownload(tempPath);

  // Reproduce an active-object replacement only inside the disposable diagnostic namespace.
  const previous = await readFile(previousPath);
  const seed = await client.storage.from(bucket).update(tempPath, previous, { contentType: "application/pdf", cacheControl: "0" });
  if (seed.error) throw new Error(`Diagnostic seed update failed: ${seed.error.message}`);
  const replacement = await client.storage.from(bucket).update(tempPath, source, { contentType: "application/pdf", cacheControl: "0" });
  if (replacement.error) throw new Error(`Diagnostic replacement update failed: ${replacement.error.message}`);
  const replacementSdk = await sdkDownload(tempPath);
  const replacementRaw = await rawDownload(tempPath);

  console.log(JSON.stringify({
    bucket,
    tempPath,
    local,
    uploads: { first: firstUpload.data, seed: seed.data, replacement: replacement.data },
    fresh: { sdk: { ...freshSdk, equal: freshSdk.bytes.equals(source) }, raw: { ...freshRaw, equal: freshRaw.bytes.equals(source) } },
    overwrite: { sdk: { ...replacementSdk, equal: replacementSdk.bytes.equals(source) }, raw: { ...replacementRaw, equal: replacementRaw.bytes.equals(source) } },
  }, (_key, value) => Buffer.isBuffer(value) ? undefined : value, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P14 storage diagnosis failed."); process.exitCode = 1; });
