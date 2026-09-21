import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

type ManifestFile = {
  component: string;
  format: string;
  logicalDeliveryPath: string;
  bytes: number;
  sha256: string;
};

type Manifest = {
  packageVersion: string;
  files: ManifestFile[];
};

type InventoryItem = {
  productId: string;
  name: string;
  role: string;
  path: string;
  expectedPages?: number;
  expectedBytes?: number;
  expectedHash?: string;
  version?: string;
};

type AuditResult = InventoryItem & {
  bucket: string;
  exists: boolean;
  authorizedDownload: boolean;
  httpStatus: number | null;
  contentType: string | null;
  downloadedBytes: number;
  pdfValid: boolean;
  pageCount: number | null;
  pageSize: string | null;
  encrypted: string | null;
  eofValid: boolean;
  failureCode: string | null;
  notes?: string;
};

async function main() {
loadEnvConfig(process.cwd());
const execFileAsync = promisify(execFile);
const stagingUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
if (process.env.POKOPIA_STAGING_ONLY !== "true" || stagingUrl !== "https://faxsnbdjzniwyhtnsvfz.supabase.co" || !serviceRoleKey) throw new Error("Staging-only guard failed.");

const p16 = JSON.parse(await readFile("assets/fulfillment/pokopia/adventure-companion/p16-v3-customer-delivery-manifest-20260919.json", "utf8")) as Manifest;
const p18 = JSON.parse(await readFile("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260919-p16-v3-refresh.json", "utf8")) as Manifest;
const inventory: InventoryItem[] = [
  { productId: "P06", name: "Pokopia Daily Reset", role: "Letter", path: "pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf", expectedPages: undefined },
  { productId: "P06", name: "Pokopia Daily Reset", role: "A4", path: "pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf", expectedPages: undefined },
  { productId: "P13", name: "Pokopia Event Tracker", role: "A4", path: "pokopia/p16-adventure-companion/P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED/P13-Pokopia-Event-Tracker-A4.pdf" },
  { productId: "P13", name: "Pokopia Event Tracker", role: "Letter", path: "pokopia/p16-adventure-companion/P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED/P13-Pokopia-Event-Tracker-US-Letter.pdf" },
  { productId: "P17", name: "Pokopia Completionist Kit", role: "Letter", path: "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf" },
  { productId: "P17", name: "Pokopia Completionist Kit", role: "A4", path: "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf" },
  { productId: "P17", name: "Pokopia Completionist Kit", role: "Card collection", path: "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf" },
  { productId: "FREE-QUICK-START", name: "Pokopia Quick Start Pack", role: "Letter", path: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf", expectedPages: 7 },
  { productId: "FREE-QUICK-START", name: "Pokopia Quick Start Pack", role: "A4", path: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf", expectedPages: 7 },
  ...p16.files.map((f) => ({ productId: "P16", name: "Pokopia Adventure Companion", role: `${f.component} / ${f.format}`, path: f.logicalDeliveryPath, expectedBytes: f.bytes, expectedHash: f.sha256, version: p16.packageVersion })),
  ...p18.files.map((f) => ({ productId: "P18", name: "Pokopia Complete Player System", role: `${f.component} / ${f.format}`, path: f.logicalDeliveryPath, expectedBytes: f.bytes, expectedHash: f.sha256, version: p18.packageVersion })),
];

const root = path.join("_TEMP", "pda", new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z"));
await mkdir(root, { recursive: true });
const client = createClient(stagingUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function inspectPdf(file: string) {
  const bytes = await readFile(file);
  const signature = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const eof = bytes.subarray(Math.max(0, bytes.length - 2048)).toString("latin1").includes("%%EOF");
  const info: Record<string, string> = {};
  let parser = "FAIL";
  try {
    const result = await execFileAsync("pdfinfo.exe", [file], { windowsHide: true });
    parser = "PASS";
    for (const line of result.stdout.split(/\r?\n/)) { const m = line.match(/^([^:]+):\s*(.*)$/); if (m) info[m[1].trim()] = m[2].trim(); }
  } catch { /* captured below */ }
  return { bytes: bytes.length, signature, eof, parser, pageCount: Number(info.Pages ?? 0), pageSize: info["Page size"] ?? null, encrypted: info.Encrypted ?? null };
}

const results: AuditResult[] = [];
for (const [index, item] of inventory.entries()) {
  const result: AuditResult = { ...item, bucket, exists: false, authorizedDownload: false, httpStatus: null, contentType: null, downloadedBytes: 0, pdfValid: false, pageCount: null, pageSize: null, encrypted: null, eofValid: false, failureCode: null };
  try {
    const { data, error } = await client.storage.from(bucket).download(item.path, { cacheNonce: crypto.randomUUID() });
    if (error || !data) { result.failureCode = "D1"; result.notes = error?.message ?? "No object returned"; results.push(result); continue; }
    result.exists = true; result.authorizedDownload = true; result.httpStatus = 200; result.contentType = data.type || null;
    const sub = `${String(index).padStart(2, "0")}-${path.basename(item.path)}`; const target = path.join(root, sub);
    await mkdir(root, { recursive: true });
    await writeFile(target, Buffer.from(await data.arrayBuffer()));
    const inspected = await inspectPdf(target); Object.assign(result, { downloadedBytes: inspected.bytes, pdfValid: inspected.signature && inspected.eof && inspected.parser === "PASS", pageCount: inspected.pageCount, pageSize: inspected.pageSize, encrypted: inspected.encrypted, eofValid: inspected.eof });
    if (!result.pdfValid) result.failureCode = inspected.bytes === 0 ? "D6" : "D7";
    if (item.expectedBytes && inspected.bytes !== item.expectedBytes) result.notes = `manifest bytes ${item.expectedBytes}, downloaded ${inspected.bytes}`;
  } catch (error) { result.failureCode = "D15"; result.notes = error instanceof Error ? error.message : String(error); }
  results.push(result);
}
await writeFile(path.join(root, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), stagingProject: "faxsnbdjzniwyhtnsvfz", bucket, inventoryCount: inventory.length, results }, null, 2));
console.log(JSON.stringify({ root, inventoryCount: inventory.length, found: results.filter(r => r.exists).length, downloaded: results.filter(r => r.authorizedDownload).length, validPdf: results.filter(r => r.pdfValid).length, failures: results.filter(r => r.failureCode).map(r => ({ productId: r.productId, role: r.role, path: r.path, failureCode: r.failureCode, notes: r.notes })), results }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
