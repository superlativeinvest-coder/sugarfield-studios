import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (process.env.POKOPIA_STAGING_ONLY !== "true" || url !== "https://faxsnbdjzniwyhtnsvfz.supabase.co" || !serviceRoleKey) throw new Error("P16 verification is restricted to staging.");
const stagingUrl = url as string;
const stagingServiceRoleKey = serviceRoleKey as string;

const paths = [
  "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf",
  "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf",
  "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-A4.pdf",
  "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf", "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf",
  "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf",
];

async function main() {
  const client = createClient(stagingUrl, stagingServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = await Promise.all(paths.map(async (path) => {
    const { data, error } = await client.storage.from(bucket).download(path, { cacheNonce: crypto.randomUUID() });
    return error || !data ? { path, present: false, error: error?.message ?? "No object returned." } : { path, present: true, bytes: (await data.arrayBuffer()).byteLength };
  }));
  console.log(JSON.stringify({ bucket, results }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 verification failed."); process.exitCode = 1; });
