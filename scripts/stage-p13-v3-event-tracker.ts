import { loadEnvConfig } from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";

if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const configuredUrl = url;
const configuredServiceRoleKey = serviceRoleKey;

const objects = [
  ["PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/Pokopia-Event-Tracker-v3-US-Letter.pdf", "pokopia/mini-tool/v3-page2-shell-20260908/Pokopia-Event-Tracker-US-Letter.pdf", "03BF63F17A9A3D7D49CE69BEDD62CF653C598044B08F14A478455D9B9562769F"],
  ["PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/Pokopia-Event-Tracker-v3-A4.pdf", "pokopia/mini-tool/v3-page2-shell-20260908/Pokopia-Event-Tracker-A4.pdf", "23ADD278EA254ABF30FE62C53D69700A226C57A7FCFAA7BD551AD7A539ECDEFD"],
] as const;

const legacyPaths = [
  "pokopia/mini-tool/pokopia-event-tracker-a4.pdf",
  "pokopia/mini-tool/pokopia-event-tracker-letter.pdf",
] as const;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

async function main() {
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const download = async (path: string) => {
    const { data, error } = await client.storage.from(bucket).download(path, { cacheNonce: randomUUID() });
    if (error || !data) throw new Error(`Could not retrieve ${path}: ${error?.message ?? "No object returned."}`);
    return Buffer.from(await data.arrayBuffer());
  };

  const active = [];
  for (const [source, path, expectedHash] of objects) {
    const sourceBytes = await readFile(source);
    if (sha256(sourceBytes) !== expectedHash) throw new Error(`Source hash mismatch: ${source}`);
    const { error: uploadError } = await client.storage.from(bucket).upload(path, sourceBytes, {
      contentType: "application/pdf",
      cacheControl: "private, max-age=0",
      upsert: false,
    });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error(`Could not stage ${path}: ${uploadError.message}`);

    const stored = await download(path);
    if (!stored.equals(sourceBytes) || sha256(stored) !== expectedHash) throw new Error(`Stored bytes differ for ${path}.`);
    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60, { cacheNonce: randomUUID() });
    if (signedError || !signed?.signedUrl) throw new Error(`Could not sign ${path}: ${signedError?.message ?? "No URL returned."}`);
    const response = await fetch(signed.signedUrl, { cache: "no-store" });
    const retrieved = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !retrieved.equals(sourceBytes) || sha256(retrieved) !== expectedHash) throw new Error(`Signed retrieval byte verification failed: ${path}.`);
    active.push({ path, bytes: sourceBytes.length, sha256: expectedHash, httpStatus: response.status, contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length") });
  }

  const legacy = await Promise.all(legacyPaths.map(async (path) => {
    const bytes = await download(path);
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  }));
  console.log(JSON.stringify({ bucket, active, legacy }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "P13 v3 staging failed.");
  process.exitCode = 1;
});
