import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const p14Files = [
  ["PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-letter-optimized-candidate.pdf", "pokopia/p16-adventure-companion/p14-cloud-islands-planner-letter.pdf"],
  ["PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-a4-optimized-candidate.pdf", "pokopia/p16-adventure-companion/p14-cloud-islands-planner-a4.pdf"],
] as const;

const p16Objects = [
  "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf",
  "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/p14-cloud-islands-planner-letter.pdf", "pokopia/p16-adventure-companion/p14-cloud-islands-planner-a4.pdf",
  "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf", "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf",
  "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf",
] as const;

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function download(path: string) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Could not download ${path}: ${error?.message ?? "no object returned"}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  return { path, bytes, size: bytes.length, sha256: hash(bytes) };
}

async function snapshot() {
  return Promise.all(p16Objects.map(async (path) => {
    const value = await download(path);
    return { path: value.path, size: value.size, sha256: value.sha256 };
  }));
}

async function main() {
  const before = await snapshot();
  if (process.argv.includes("--snapshot")) {
    console.log(JSON.stringify({ bucket, objects: before }, null, 2));
    return;
  }

  const original = new Map<string, Buffer>();
  for (const [, path] of p14Files) original.set(path, (await download(path)).bytes);
  try {
    for (const [source, path] of p14Files) {
      const expected = await readFile(source);
      const { error } = await client.storage.from(bucket).upload(path, expected, { contentType: "application/pdf", upsert: true });
      if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
      const downloaded = await download(path);
      if (!downloaded.bytes.equals(expected)) throw new Error(`Byte mismatch after upload for ${path}.`);
      if (downloaded.sha256 !== hash(expected)) throw new Error(`SHA-256 mismatch after upload for ${path}.`);
    }
    const after = await snapshot();
    const beforeByPath = new Map(before.map((item) => [item.path, item]));
    const changed = after.filter((item) => {
      const prior = beforeByPath.get(item.path);
      return !prior || prior.sha256 !== item.sha256 || prior.size !== item.size;
    }).map((item) => item.path);
    const expectedChanged = p14Files.map(([, path]) => path).sort();
    if (JSON.stringify(changed.sort()) !== JSON.stringify(expectedChanged)) throw new Error(`Unexpected storage changes: ${changed.join(", ") || "none"}`);
    console.log(JSON.stringify({ bucket, before, after, changed, verified: true }, null, 2));
  } catch (error) {
    await Promise.all([...original.entries()].map(async ([path, bytes]) => {
      await client.storage.from(bucket).upload(path, bytes, { contentType: "application/pdf", upsert: true });
    }));
    throw error;
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 P14 update failed."); process.exitCode = 1; });
