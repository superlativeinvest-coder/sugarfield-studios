import { loadEnvConfig } from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const storageUrl = url;
const storageKey = key;

const activeLetterPath = "pokopia/p16-adventure-companion/p14-cloud-islands-planner-letter.pdf";
const activeA4Path = "pokopia/p16-adventure-companion/p14-cloud-islands-planner-a4.pdf";
const oldLetterPath = "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf";
const candidateLetterPath = "PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-letter-optimized-candidate.pdf";
const candidateA4Path = "PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-a4-optimized-candidate.pdf";
const fixedDefaultPath = "_temp/p14-overwrite-cache-test.pdf";
const fixedNoCachePath = "_temp/p14-overwrite-cache-test-no-cache.pdf";
const versionRoot = "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100";
const reportPath = "tmp/pdfs/p14-v2-optimization/storage-proof-method-report.json";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const client = createClient(storageUrl, storageKey, { auth: { persistSession: false, autoRefreshToken: false } });
const headersOf = (headers: Headers) => Object.fromEntries(["content-type", "content-length", "content-encoding", "etag", "last-modified", "cache-control", "cf-cache-status", "age"].map((name) => [name, headers.get(name)]));

async function sdk(path: string, fresh = false) {
  const { data, error } = await client.storage.from(bucket).download(path, fresh ? { cacheNonce: randomUUID() } : undefined);
  if (error || !data) throw new Error(`SDK download ${path}: ${error?.message ?? "no data"}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, size: bytes.length, sha256: hash(bytes), contentType: data.type || null };
}

async function signed(path: string) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60, { cacheNonce: randomUUID() });
  if (error || !data?.signedUrl) throw new Error(`Signed URL ${path}: ${error?.message ?? "no URL"}`);
  const response = await fetch(data.signedUrl, { headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`Signed URL fetch ${path}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, size: bytes.length, sha256: hash(bytes), headers: headersOf(response.headers) };
}

async function raw(path: string) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${storageUrl}/storage/v1/object/authenticated/${bucket}/${encodedPath}?cacheNonce=${randomUUID()}`, {
    headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Raw fetch ${path}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, size: bytes.length, sha256: hash(bytes), headers: headersOf(response.headers) };
}

async function metadata(path: string) {
  const { data, error } = await client.storage.from(bucket).info(path);
  if (error || !data) throw new Error(`Metadata ${path}: ${error?.message ?? "no data"}`);
  return data;
}

function publicResult(value: Awaited<ReturnType<typeof sdk>> | Awaited<ReturnType<typeof signed>> | Awaited<ReturnType<typeof raw>>, old: Buffer, candidate: Buffer) {
  return { size: value.size, sha256: value.sha256, equalsOld: value.bytes.equals(old), equalsCandidate: value.bytes.equals(candidate), ...("contentType" in value ? { contentType: value.contentType } : { headers: value.headers }) };
}

async function save(value: unknown) {
  await writeFile(reportPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function activeState() {
  const [letter, a4] = await Promise.all([activeLetterPath, activeA4Path].map(async (path) => {
    const result = await sdk(path, true);
    return { path, download: publicResult(result, Buffer.alloc(0), Buffer.alloc(0)), metadata: await metadata(path) };
  }));
  return { bucket, active: { letter, a4 } };
}

async function overwriteTest(path: string, cacheControl: string | undefined, old: Buffer, candidate: Buffer) {
  const seed = await client.storage.from(bucket).upload(path, old, { contentType: "application/pdf", upsert: true, ...(cacheControl === undefined ? {} : { cacheControl }) });
  if (seed.error) throw new Error(`Seed ${path}: ${seed.error.message}`);
  const seedRead = await sdk(path);
  const replacement = await client.storage.from(bucket).upload(path, candidate, { contentType: "application/pdf", upsert: true, ...(cacheControl === undefined ? {} : { cacheControl }) });
  if (replacement.error) throw new Error(`Replace ${path}: ${replacement.error.message}`);
  const [plain, sdkFresh, signedFresh, rawFresh, info] = await Promise.all([sdk(path), sdk(path, true), signed(path), raw(path), metadata(path)]);
  return {
    path,
    cacheControl: cacheControl ?? "SDK default (3600)",
    seed: { upload: seed.data, read: publicResult(seedRead, old, candidate) },
    replacement: { upload: replacement.data, metadata: info, plain: publicResult(plain, old, candidate), sdkFresh: publicResult(sdkFresh, old, candidate), signedFresh: publicResult(signedFresh, old, candidate), rawFresh: publicResult(rawFresh, old, candidate) },
  };
}

async function versioned(path: string, candidate: Buffer) {
  const upload = await client.storage.from(bucket).upload(path, candidate, { contentType: "application/pdf", upsert: false });
  if (upload.error) throw new Error(`Versioned upload ${path}: ${upload.error.message}`);
  const [sdkFresh, signedFresh, info] = await Promise.all([sdk(path, true), signed(path), metadata(path)]);
  return { path, upload: upload.data, metadata: info, sdkFresh: publicResult(sdkFresh, Buffer.alloc(0), candidate), signedFresh: publicResult(signedFresh, Buffer.alloc(0), candidate) };
}

async function main() {
  const stage = process.argv[2] ?? "active";
  const old = await readFile(oldLetterPath);
  const letter = await readFile(candidateLetterPath);
  const a4 = await readFile(candidateA4Path);
  let result: unknown;
  if (stage === "active") result = await activeState();
  else if (stage === "default-overwrite") result = await overwriteTest(fixedDefaultPath, undefined, old, letter);
  else if (stage === "no-cache-overwrite") result = await overwriteTest(fixedNoCachePath, "0", old, letter);
  else if (stage === "versioned-letter") result = await versioned(`${versionRoot}/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf`, letter);
  else if (stage === "versioned-a4") result = await versioned(`${versionRoot}/P14-Pokopia-Cloud-Islands-Planner-A4.pdf`, a4);
  else throw new Error(`Unknown stage: ${stage}`);
  await save({ stage, generatedAt: new Date().toISOString(), result });
  console.log(JSON.stringify({ stage, result }, (_key, value) => Buffer.isBuffer(value) ? undefined : value, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Storage proof failed."); process.exitCode = 1; });
