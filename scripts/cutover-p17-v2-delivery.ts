import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";

if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const configuredUrl = url;
const configuredServiceRoleKey = serviceRoleKey;

if (process.env.POKOPIA_STAGING_ONLY !== "true" || configuredUrl !== "https://faxsnbdjzniwyhtnsvfz.supabase.co") {
  throw new Error("P17 delivery cutover is restricted to the authorized staging Supabase project.");
}

const activeFiles = [
  ["PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/Pokopia-Field-Guide-US-Letter.pdf", "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf", "application/pdf", "7B060DDC9B3F0FC946E4271CCA65197FC2945E19C549798CE7C2B791E216FFAF"],
  ["PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/Pokopia-Field-Guide-A4.pdf", "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf", "application/pdf", "72799BC69CE5A0633E9CE782996952C30782A56C09DBC6A147711DB46F37D97D"],
  ["PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/Pokopia-26-Card-Reference-Collection.pdf", "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf", "application/pdf", "FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB"],
  ["PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/README.md", "pokopia/completionist-kit/v2-corrected-20260908/README.md", "text/markdown; charset=utf-8", "C7AB5ED235DAA0E88CB6E68A5A822CDD5DA5E649E552A47FE6ABFDB02AB11D76"],
] as const;

const legacyPaths = [
  "pokopia/completionist-kit/pokopia-completionist-kit-field-guide-letter.pdf",
  "pokopia/completionist-kit/pokopia-completionist-kit-field-guide-a4.pdf",
  "pokopia/completionist-kit/pokopia-completionist-kit-26-card-collection.zip",
  "pokopia/completionist-kit/pokopia-completionist-kit-start-here-letter.pdf",
  "pokopia/completionist-kit/pokopia-completionist-kit-start-here-a4.pdf",
] as const;

function sha256(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex").toUpperCase(); }

async function main() {
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  async function download(path: string): Promise<Buffer> {
    const { data, error } = await client.storage.from(bucket).download(path, { cacheNonce: crypto.randomUUID() });
    if (error || !data) throw new Error(`Could not retrieve ${path}: ${error?.message ?? "No object returned."}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const active: { source: string; path: string; bytes: number; sha256: string; contentType: string; signedUrlStatus: number; signedUrlContentType: string | null; signedUrlContentLength: string | null }[] = [];

  for (const [source, path, contentType, expectedHash] of activeFiles) {
    const sourceBytes = await readFile(source);
    const sourceHash = sha256(sourceBytes);
    if (sourceHash !== expectedHash) throw new Error(`Source hash mismatch for ${source}: ${sourceHash}`);

    const { error: uploadError } = await client.storage.from(bucket).upload(path, sourceBytes, { contentType, upsert: false, cacheControl: "private, max-age=0" });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error(`Could not upload ${path}: ${uploadError.message}`);

    const stored = await download(path);
    if (!stored.equals(sourceBytes) || sha256(stored) !== expectedHash) throw new Error(`Stored bytes do not match ${source} at ${path}.`);

    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60, { cacheNonce: crypto.randomUUID() });
    if (signedError || !signed?.signedUrl) throw new Error(`Could not create signed URL for ${path}: ${signedError?.message ?? "No signed URL returned."}`);
    const response = await fetch(signed.signedUrl, { cache: "no-store" });
    const retrieved = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !retrieved.equals(sourceBytes) || sha256(retrieved) !== expectedHash) throw new Error(`Signed retrieval failed byte verification for ${path}.`);

    active.push({ source, path, bytes: sourceBytes.length, sha256: sourceHash, contentType, signedUrlStatus: response.status, signedUrlContentType: response.headers.get("content-type"), signedUrlContentLength: response.headers.get("content-length") });
  }

  const legacy = await Promise.all(legacyPaths.map(async (path) => {
    try {
      const bytes = await download(path);
      return { path, present: true, bytes: bytes.length, sha256: sha256(bytes) };
    } catch {
      return { path, present: false };
    }
  }));
  const { data: orders, error: ordersError } = await client.from("orders").select("id, created_at, entitlements").eq("product_id", "P17").eq("status", "paid");
  if (ordersError) throw new Error(`Could not inspect P17 order history: ${ordersError.message}`);

  console.log(JSON.stringify({ bucket, active, legacy, paidP17OrderCount: orders?.length ?? 0, paidP17Orders: orders ?? [] }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P17 cutover failed."); process.exitCode = 1; });
