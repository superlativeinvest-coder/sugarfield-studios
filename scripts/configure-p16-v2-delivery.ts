import { loadEnvConfig } from "@next/env";
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
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P06-Pokopia-Daily-Reset-US-Letter.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P06-Pokopia-Daily-Reset-A4.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P13-Pokopia-Event-Tracker-US-Letter.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P13-Pokopia-Event-Tracker-A4.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P15-Pokopia-Spawn-Tracker-US-Letter.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P15-Pokopia-Spawn-Tracker-A4.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf", "pokopia/p16-adventure-companion/p14-cloud-islands-planner-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P14-Pokopia-Cloud-Islands-Planner-A4.pdf", "pokopia/p16-adventure-companion/p14-cloud-islands-planner-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P05-Pokopia-Field-Guide-US-Letter.pdf", "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P05-Pokopia-Field-Guide-A4.pdf", "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P16-Pokopia-Adventure-Dashboard-US-Letter.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P16-Pokopia-Adventure-Dashboard-A4.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf"],
] as const;

async function main() {
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result: { path: string; bytes: number; ok: boolean }[] = [];
  for (const [source, path] of files) {
    const contents = await readFile(source);
    const { error } = await client.storage.from(bucket).upload(path, contents, { contentType: "application/pdf", upsert: true });
    if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
    const { data, error: downloadError } = await client.storage.from(bucket).download(path);
    if (downloadError || !data) throw new Error(`Could not verify ${path}: ${downloadError?.message ?? "No object returned."}`);
    const downloaded = Buffer.from(await data.arrayBuffer());
    if (!downloaded.equals(contents)) throw new Error(`Uploaded bytes do not match staged source for ${path}.`);
    result.push({ path, bytes: downloaded.length, ok: true });
  }
  console.log(JSON.stringify({ bucket, count: result.length, files: result }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 delivery setup failed."); process.exitCode = 1; });
