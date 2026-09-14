import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const configuredUrl = url as string;
const configuredServiceRoleKey = serviceRoleKey as string;

const files = [
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P15-Pokopia-Spawn-Tracker-US-Letter.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P15-Pokopia-Spawn-Tracker-A4.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf"],
] as const;

function sha256(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function main() {
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result: { path: string; bytes: number; sha256: string }[] = [];
  for (const [source, path] of files) {
    const contents = await readFile(source);
    const { error } = await client.storage.from(bucket).upload(path, contents, { contentType: "application/pdf", upsert: true });
    if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
    const { data, error: downloadError } = await client.storage.from(bucket).download(path);
    if (downloadError || !data) throw new Error(`Could not verify ${path}: ${downloadError?.message ?? "No object returned."}`);
    const downloaded = Buffer.from(await data.arrayBuffer());
    if (!downloaded.equals(contents)) throw new Error(`Uploaded bytes do not match staged source for ${path}.`);
    result.push({ path, bytes: downloaded.length, sha256: sha256(downloaded) });
  }
  console.log(JSON.stringify({ bucket, files: result }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 Spawn Tracker refresh failed."); process.exitCode = 1; });
