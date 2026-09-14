import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
const supabaseUrl = url;
const supabaseServiceRoleKey = serviceRoleKey;

const files = [
  {
    id: "letter",
    source: "PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_US_Letter_FINAL.pdf",
    path: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf",
    bytes: 19_855_586,
    sha256: "E649FFE1274C3F5B9CE0A6498E88F2D8C2D99976B86C723CF2FDB6B1C9863569",
  },
  {
    id: "a4",
    source: "PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_A4_FINAL.pdf",
    path: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf",
    bytes: 19_293_891,
    sha256: "B8D33E9F19E4CB6D49266B67B31DDCF7648257DC92836A8D34DCE4C37F7F4D7D",
  },
] as const;

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex").toUpperCase();

async function main() {
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bucketInfo, error: bucketError } = await client.storage.getBucket(bucket);
  if (bucketError || !bucketInfo) throw new Error(`Could not inspect private storage bucket: ${bucketError?.message ?? "No bucket data"}`);
  if (bucketInfo.public) throw new Error("Refusing to stage Quick Start PDFs because the configured bucket is public.");
  console.log(JSON.stringify({ bucket: bucketInfo.id, public: bucketInfo.public, fileSizeLimit: bucketInfo.file_size_limit ?? null }));

  for (const file of files) {
    const source = await readFile(file.source);
    if (source.length !== file.bytes || sha256(source) !== file.sha256) throw new Error(`Approved ${file.id} source integrity mismatch.`);
    const { error: uploadError } = await client.storage.from(bucket).upload(file.path, source, {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: true,
    });
    if (uploadError) throw new Error(`Could not stage ${file.id}: ${uploadError.message}`);

    const { data: blob, error: downloadError } = await client.storage.from(bucket).download(file.path);
    if (downloadError || !blob) throw new Error(`Could not download staged ${file.id}: ${downloadError?.message ?? "No blob"}`);
    const downloaded = Buffer.from(await blob.arrayBuffer());
    if (downloaded.length !== source.length || sha256(downloaded) !== file.sha256 || !downloaded.equals(source)) throw new Error(`Staged ${file.id} byte verification failed.`);

    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(file.path, 3600);
    if (signedError || !signed?.signedUrl) throw new Error(`Could not sign staged ${file.id}: ${signedError?.message ?? "No signed URL"}`);
    const response = await fetch(signed.signedUrl);
    const responseBytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "application/pdf" || responseBytes.length !== source.length || sha256(responseBytes) !== file.sha256 || !responseBytes.equals(source)) throw new Error(`Signed URL verification failed for staged ${file.id}.`);
    console.log(JSON.stringify({ id: file.id, path: file.path, bytes: source.length, sha256: file.sha256, signedUrlVerified: true }));
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Quick Start staging failed."); process.exitCode = 1; });
