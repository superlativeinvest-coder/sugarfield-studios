import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";

if (process.env.POKOPIA_STAGING_ONLY !== "true" || url !== "https://faxsnbdjzniwyhtnsvfz.supabase.co" || !serviceRoleKey) {
  throw new Error("P16 delivery staging is restricted to the authorized staging Supabase project.");
}
const stagingUrl = url as string;
const stagingServiceRoleKey = serviceRoleKey as string;

const files = [
  ["PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-letter-optimized-candidate.pdf", "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf", "34ADBECE0B28CF63D0EA7AD78839E1A69AEC960F6FC24EB83834EE8D27E829DD"],
  ["PRODUCTS/POKOPIA/P14_Cloud_Islands_Planner_v2/package/optimization-candidates/p14-cloud-islands-planner-v2-a4-optimized-candidate.pdf", "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-A4.pdf", "A3338F668BA4D92F87982F69444A9AC11890C42741608A9FC3C12D281206A102"],
] as const;

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();

async function main() {
  const client = createClient(stagingUrl, stagingServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = [] as { path: string; bytes: number; sha256: string; signedUrlStatus: number }[];
  for (const [source, path, expectedHash] of files) {
    const sourceBytes = await readFile(source);
    if (sha256(sourceBytes) !== expectedHash) throw new Error(`Source hash mismatch for ${source}.`);
    const { error: uploadError } = await client.storage.from(bucket).upload(path, sourceBytes, { contentType: "application/pdf", cacheControl: "private, max-age=0", upsert: false });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error(`Could not upload ${path}: ${uploadError.message}`);
    const { data: stored, error: storedError } = await client.storage.from(bucket).download(path, { cacheNonce: crypto.randomUUID() });
    if (storedError || !stored) throw new Error(`Could not verify ${path}: ${storedError?.message ?? "No object returned."}`);
    const storedBytes = Buffer.from(await stored.arrayBuffer());
    if (!storedBytes.equals(sourceBytes) || sha256(storedBytes) !== expectedHash) throw new Error(`Stored bytes do not match ${source}.`);
    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60, { cacheNonce: crypto.randomUUID() });
    if (signedError || !signed?.signedUrl) throw new Error(`Could not sign ${path}: ${signedError?.message ?? "No signed URL returned."}`);
    const response = await fetch(signed.signedUrl, { cache: "no-store" });
    const signedBytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !signedBytes.equals(sourceBytes) || sha256(signedBytes) !== expectedHash) throw new Error(`Signed retrieval failed for ${path}.`);
    verified.push({ path, bytes: sourceBytes.length, sha256: expectedHash, signedUrlStatus: response.status });
  }
  console.log(JSON.stringify({ bucket, verified }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "P16 staging failed."); process.exitCode = 1; });
