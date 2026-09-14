import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const configuredUrl = url;
const configuredServiceRoleKey = serviceRoleKey;

const expectedHashes = new Set([
  "03BF63F17A9A3D7D49CE69BEDD62CF653C598044B08F14A478455D9B9562769F",
  "23ADD278EA254ABF30FE62C53D69700A226C57A7FCFAA7BD551AD7A539ECDEFD",
]);
const baseUrl = process.env.P13_SMOKE_BASE_URL ?? "http://127.0.0.1:3013";

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

async function verifyEntitledRoute(orderId: string) {
  const response = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(orderId)}/downloads/P13`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Entitled P13 route returned HTTP ${response.status}.`);
  const payload = await response.json() as { downloads?: { url: string }[] };
  if (payload.downloads?.length !== 2) throw new Error(`Expected two P13 downloads; received ${payload.downloads?.length ?? 0}.`);
  const downloads = [];
  for (const download of payload.downloads) {
    const fileResponse = await fetch(download.url, { cache: "no-store" });
    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    const hash = sha256(bytes);
    if (!fileResponse.ok || fileResponse.headers.get("content-type") !== "application/pdf" || !expectedHashes.has(hash)) {
      throw new Error("Signed P13 download failed verification.");
    }
    downloads.push({ status: fileResponse.status, bytes: bytes.length, sha256: hash, contentType: fileResponse.headers.get("content-type") });
  }
  return downloads;
}

async function main() {
  const client = createClient(configuredUrl, configuredServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: orders, error } = await client.from("orders").select("id, created_at").eq("product_id", "P13").eq("status", "paid").order("created_at", { ascending: true });
  if (error) throw new Error(`Could not inspect paid P13 orders: ${error.message}`);
  if (!orders?.length) throw new Error("No paid P13 order exists for entitlement smoke testing.");

  const existing = orders[0]!;
  const current = orders[orders.length - 1]!;
  const existingDownloads = await verifyEntitledRoute(existing.id);
  const currentDownloads = await verifyEntitledRoute(current.id);
  const unauthorized = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(existing.id)}/downloads/P06`, { cache: "no-store" });
  if (unauthorized.status !== 403) throw new Error(`Expected non-entitled P06 request to return 403; received ${unauthorized.status}.`);

  console.log(JSON.stringify({ paidP13OrderCount: orders.length, existingOrderCreatedAt: existing.created_at, currentOrderCreatedAt: current.created_at, existingDownloads, currentDownloads, nonEntitledRequestStatus: unauthorized.status }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "P13 entitlement smoke test failed.");
  process.exitCode = 1;
});
