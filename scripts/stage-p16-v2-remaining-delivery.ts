import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (process.env.POKOPIA_STAGING_ONLY !== "true" || url !== "https://faxsnbdjzniwyhtnsvfz.supabase.co" || !serviceRoleKey) throw new Error("P16 delivery staging is restricted to the authorized staging Supabase project.");
const stagingUrl = url as string;
const stagingServiceRoleKey = serviceRoleKey as string;

const files = [
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P06-Pokopia-Daily-Reset-US-Letter.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P06-Pokopia-Daily-Reset-A4.pdf", "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P13-Pokopia-Event-Tracker-US-Letter.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P13-Pokopia-Event-Tracker-A4.pdf", "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P15-Pokopia-Spawn-Tracker-US-Letter.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P15-Pokopia-Spawn-Tracker-A4.pdf", "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P05-Pokopia-Field-Guide-US-Letter.pdf", "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P05-Pokopia-Field-Guide-A4.pdf", "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P16-Pokopia-Adventure-Dashboard-US-Letter.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf"],
  ["PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P16-Pokopia-Adventure-Dashboard-A4.pdf", "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf"],
] as const;

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();

async function main() {
  const client = createClient(stagingUrl, stagingServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = [] as { path: string; bytes: number; sha256: string; signedUrlStatus: number }[];
  for (const [source, path] of files) {
    const sourceBytes = await readFile(source);
    const sourceHash = sha256(sourceBytes);
    const { error: uploadError } = await client.storage.from(bucket).upload(path, sourceBytes, { contentType: "application/pdf", cacheControl: "private, max-age=0", upsert: false });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error(`Could not upload ${path}: ${uploadError.message}`);
    const { data: stored, error: storedError } = await client.storage.from(bucket).download(path, { cacheNonce: crypto.randomUUID() });
    if (storedError || !stored) throw new Error(`Could not verify ${path}: ${storedError?.message ?? "No object returned."}`);
    const storedBytes = Buffer.from(await stored.arrayBuffer());
    if (!storedBytes.equals(sourceBytes) || sha256(storedBytes) !== sourceHash) throw new Error(`Stored bytes do not match ${source}.`);
    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60, { cacheNonce: crypto.randomUUID() });
    if (signedError || !signed?.signedUrl) throw new Error(`Could not sign ${path}: ${signedError?.message ?? "No signed URL returned."}`);
    const response = await fetch(signed.signedUrl, { cache: "no-store" });
    const signedBytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !signedBytes.equals(sourceBytes) || sha256(signedBytes) !== sourceHash) throw new Error(`Signed retrieval failed for ${path}.`);
    verified.push({ path, bytes: sourceBytes.length, sha256: sourceHash, signedUrlStatus: response.status });
  }
  console.log(JSON.stringify({ bucket, verified }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 staging failed."); process.exitCode = 1; });
