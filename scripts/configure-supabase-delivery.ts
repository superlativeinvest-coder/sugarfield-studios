import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
const supabaseUrl = url;
const supabaseServiceRoleKey = serviceRoleKey;

async function main() {
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: bucketError } = await client.storage.createBucket(bucket, { public: false });
  if (bucketError && !/already exists/i.test(bucketError.message)) throw new Error(`Could not create private storage bucket: ${bucketError.message}`);
  const quickStartFiles = [
    ["PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_US_Letter_FINAL.pdf", "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf"],
    ["PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_A4_FINAL.pdf", "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf"],
  ] as const;
  const existingFiles = [
    ["public/assets/products/pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf", "pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf"],
    ["public/assets/products/pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf", "pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf"],
    ["assets/fulfillment/pokopia/mini-tool/pokopia-event-tracker-a4.pdf", "pokopia/mini-tool/pokopia-event-tracker-a4.pdf"],
    ["assets/fulfillment/pokopia/mini-tool/pokopia-event-tracker-letter.pdf", "pokopia/mini-tool/pokopia-event-tracker-letter.pdf"],
    ["assets/fulfillment/pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf", "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf"],
    ["assets/fulfillment/pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf", "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf"],
    ["assets/fulfillment/pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf", "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf"],
    ["assets/fulfillment/pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf", "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf"],
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
  const files = process.argv.includes("--quick-start-only") ? quickStartFiles : [...quickStartFiles, ...existingFiles];
  for (const [source, path] of files) {
    const contents = await readFile(source);
    const contentType = source.toLowerCase().endsWith(".zip") ? "application/zip" : "application/pdf";
    const { error } = await client.storage.from(bucket).upload(path, contents, { contentType, upsert: true });
    if (error) throw new Error(`Could not upload ${path}: ${error.message}`);
  }
  console.log(`Private Supabase Storage bucket ready: ${bucket}`);
  console.log(`Uploaded ${files.length} configured product PDFs.`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Supabase delivery setup failed."); process.exitCode = 1; });
