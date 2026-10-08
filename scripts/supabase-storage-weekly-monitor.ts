import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const PRODUCTION_PROJECT = "lbbxdvszykxdaytqmqnl";
const PRODUCTION_URL = `https://${PRODUCTION_PROJECT}.supabase.co`;
const BUCKET = "digital-products";
const THRESHOLD_BYTES = 1_100_000_000;
const GREEN_LIMIT_BYTES = 1_050_000_000;
const LARGE_OBJECT_BYTES = 20_000_000;
const VERY_LARGE_OBJECT_BYTES = 50_000_000;
const HISTORY_PATH = "_OPS/SUPABASE_STORAGE_WEEKLY_HISTORY.csv";
const OBJECT_SNAPSHOT_PATH = "_OPS/SUPABASE_STORAGE_WEEKLY_OBJECTS.json";
const REPORT_PATH = "_OPS/SUPABASE_STORAGE_WEEKLY_REPORT.md";

type ObjectRecord = {
  path: string;
  size: number;
  createdAt: string | null;
  updatedAt: string | null;
  etag: string | null;
};

type Snapshot = Record<string, ObjectRecord>;

type ActiveProduct = {
  product: string;
  paths: string[];
  enabled: boolean;
};

const HISTORY_HEADER = [
  "checked_at_utc",
  "total_bytes",
  "total_gb",
  "object_count",
  "delta_bytes",
  "delta_gb",
  "growth_percent",
  "threshold_status",
  "largest_object_bytes",
  "new_large_objects",
  "duplicate_candidates",
  "active_reference_status",
  "notes",
].join(",");

function readEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return values;
}

function csv(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatGb(bytes: number): string {
  return (bytes / 1_000_000_000).toFixed(9);
}

function formatBytes(bytes: number): string {
  return new Intl.NumberFormat("en-US").format(bytes);
}

function statusFor(bytes: number): "GREEN" | "YELLOW" | "RED" {
  if (bytes < GREEN_LIMIT_BYTES) return "GREEN";
  if (bytes < THRESHOLD_BYTES) return "YELLOW";
  return "RED";
}

async function listAll(client: SupabaseClient): Promise<ObjectRecord[]> {
  const records: ObjectRecord[] = [];
  async function walk(prefix: string): Promise<void> {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Storage inventory failed at ${prefix || "/"}: ${error.message}`);
    for (const item of data ?? []) {
      const path = `${prefix}${item.name}`;
      if (!item.id) await walk(`${path}/`);
      else records.push({
        path,
        size: Number(item.metadata?.size ?? item.metadata?.contentLength ?? 0),
        createdAt: item.created_at ?? null,
        updatedAt: item.updated_at ?? null,
        etag: item.metadata?.eTag ?? item.metadata?.etag ?? null,
      });
    }
  }
  await walk("");
  return records;
}

function activeProducts(values: Record<string, string>): ActiveProduct[] {
  const p18Enabled = values.P18_CHECKOUT_ACTIVATION_ENABLED === "true";
  let p18Paths: string[] = [];
  try {
    const manifest = JSON.parse(readFileSync("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260919-p16-v3-refresh.json", "utf8")) as { files?: Array<{ logicalDeliveryPath?: string }> };
    p18Paths = (manifest.files ?? []).map((file) => (file.logicalDeliveryPath ?? "").replace(
      "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED",
      "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919",
    )).filter(Boolean);
  } catch {
    p18Paths = [];
  }
  return [
    { product: "FREE Quick Start", enabled: true, paths: [
      "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf",
      "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf",
    ] },
    { product: "P06 Daily Reset", enabled: true, paths: [
      "pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf",
      "pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf",
    ] },
    { product: "P16 Adventure Companion", enabled: true, paths: [
      "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf",
      "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf",
      "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf",
      "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf",
      "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf",
      "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf",
      "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf",
      "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf",
      "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf",
      "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf",
      "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf",
      "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-A4.pdf",
      "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf",
      "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf",
      "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf",
      "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf",
    ] },
    { product: "P17 Completionist Kit", enabled: true, paths: [
      "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf",
      "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf",
      "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf",
      "pokopia/completionist-kit/v2-corrected-20260908/README.md",
    ] },
    { product: "P18 Complete Player System", enabled: p18Enabled, paths: p18Paths },
  ];
}

function getDuplicateGroups(records: ObjectRecord[]): Map<string, ObjectRecord[]> {
  const groups = new Map<string, ObjectRecord[]>();
  for (const record of records) {
    if (!record.etag) continue;
    groups.set(record.etag, [...(groups.get(record.etag) ?? []), record]);
  }
  return new Map([...groups].filter(([, group]) => group.length > 1));
}

function loadPreviousSnapshot(): Snapshot | null {
  if (!existsSync(OBJECT_SNAPSHOT_PATH)) return null;
  const snapshot = JSON.parse(readFileSync(OBJECT_SNAPSHOT_PATH, "utf8")) as Snapshot;
  return Object.keys(snapshot).length ? snapshot : null;
}

function loadPreviousTotals(): { totalBytes: number; checkedAt: string } | null {
  if (!existsSync(HISTORY_PATH)) return null;
  const lines = readFileSync(HISTORY_PATH, "utf8").trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const fields = lines[lines.length - 1].split(",");
  const totalBytes = Number(fields[1]);
  return Number.isFinite(totalBytes) ? { totalBytes, checkedAt: fields[0] } : null;
}

function p18Discrepancy(records: ObjectRecord[]): string {
  const hasCompletePlayerFamily = records.some((record) => record.path.startsWith("pokopia/complete-player-system/"));
  const hasP18Family = records.some((record) => record.path.startsWith("pokopia/p18-complete-player-system/"));
  return hasCompletePlayerFamily && hasP18Family ? "unchanged — both documented P18 path families present" : "CHANGED — documented P18 path-family state differs";
}

function renderReport(input: {
  checkedAt: string;
  records: ObjectRecord[];
  previous: { totalBytes: number; checkedAt: string } | null;
  status: "GREEN" | "YELLOW" | "RED";
  newLarge: ObjectRecord[];
  currentDuplicateCandidates: ObjectRecord[][];
  newDuplicateCandidates: ObjectRecord[][];
  activeStatus: string;
  activeDetails: string[];
  discrepancy: string;
  watchSignals: ObjectRecord[];
}): string {
  const { checkedAt, records, previous, status, newLarge, currentDuplicateCandidates, newDuplicateCandidates, activeStatus, activeDetails, discrepancy, watchSignals } = input;
  const totalBytes = records.reduce((sum, record) => sum + record.size, 0);
  const delta = previous ? totalBytes - previous.totalBytes : null;
  const remaining = THRESHOLD_BYTES - totalBytes;
  const largest = [...records].sort((a, b) => b.size - a.size).slice(0, 10);
  const veryLargeCount = records.filter((record) => record.size >= VERY_LARGE_OBJECT_BYTES).length;
  const alert = status === "GREEN" ? "STORAGE STATUS GREEN — NO ACTION NEEDED" : status === "YELLOW" ? "STORAGE STATUS YELLOW — CLEANUP REVIEW RECOMMENDED" : "STORAGE STATUS RED — CLEANUP REVIEW REQUIRED";
  return `# Weekly Supabase Storage Report

Checked: ${checkedAt}
Project: \`${PRODUCTION_PROJECT}\`
Bucket: \`${BUCKET}\`

## Status

**${alert}**

| Measure | Result |
|---|---:|
| Threshold status | ${status} |
| Total bytes | ${formatBytes(totalBytes)} |
| Total decimal GB | ${formatGb(totalBytes)} |
| Object count | ${records.length} |
| Change since previous successful run | ${delta === null ? "Baseline — no growth claim" : `${delta >= 0 ? "+" : ""}${formatBytes(delta)} bytes (${formatGb(Math.abs(delta))} GB)`} |
| Weekly growth percentage | ${delta === null || !previous || previous.totalBytes === 0 ? "Baseline — no growth claim" : `${((delta / previous.totalBytes) * 100).toFixed(4)}%`} |
| Previous checked at | ${previous?.checkedAt ?? "Baseline run"} |
| Threshold used | ${(totalBytes / THRESHOLD_BYTES * 100).toFixed(2)}% |
| Remaining before 1.10 GB | ${remaining >= 0 ? formatBytes(remaining) : `-${formatBytes(Math.abs(remaining))}`} bytes |

## Top 10 largest objects

| Object | Size bytes | Updated |
|---|---:|---|
${largest.map((record) => `| \`${record.path}\` | ${formatBytes(record.size)} | ${record.updatedAt ?? "unknown"} |`).join("\n")}

## Newly added large objects

${previous ? (newLarge.length ? newLarge.map((record) => `- \`${record.path}\` — ${formatBytes(record.size)} bytes`).join("\n") : "None at or above 20 MB since the previous snapshot.") : "Baseline run — newly added objects cannot be determined until the next successful snapshot."}

## Review signals

Objects matching large-object or review-path signals are review-only; no safety or deletion decision is made here.

Objects at or above 50 MB: ${veryLargeCount}.

${watchSignals.length ? watchSignals.slice(0, 20).map((record) => `- \`${record.path}\` — ${formatBytes(record.size)} bytes`).join("\n") : "No current large-object/path review signals."}

## Duplicate candidates

ETag-sharing groups are signals only and are not cryptographic identity proof.

Newly detected duplicate groups: ${previous ? newDuplicateCandidates.length : "Baseline — cannot determine newly detected groups"}.

${currentDuplicateCandidates.length ? currentDuplicateCandidates.map((group) => `- ${group.length} objects sharing ETag metadata: ${group.map((record) => `\`${record.path}\``).join(", ")}`).join("\n") : "No duplicate candidate groups detected."}

## Active mapped delivery objects

**${activeStatus}**

${activeDetails.map((detail) => `- ${detail}`).join("\n")}

## P18 discrepancy

${discrepancy}. The documented discrepancy is not modified or resolved by this monitor.

## Recommended next action

${status === "GREEN" ? "No cleanup review is needed from the threshold perspective. Continue weekly monitoring." : status === "YELLOW" ? "Schedule a manual cleanup review. Do not remove objects based on this report alone." : "Schedule immediate manual cleanup review. Do not remove objects automatically."}

This monitor is read-only against Supabase Storage. It does not delete, move,
overwrite, rename, compress, or mutate objects, and it does not change billing,
migrations, mappings, entitlements, Stripe, TikTok, funnel logic, or analytics.
`;
}

async function main(): Promise<void> {
  const values = readEnv();
  if (values.SUPABASE_URL !== PRODUCTION_URL) throw new Error("Production target guard failed.");
  if (!values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Production service-role key missing.");
  const client = createClient(PRODUCTION_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const records = await listAll(client);
  const previousSnapshot = loadPreviousSnapshot();
  const previousTotals = loadPreviousTotals();
  const currentSnapshot = Object.fromEntries(records.map((record) => [record.path, record]));
  const totalBytes = records.reduce((sum, record) => sum + record.size, 0);
  const status = statusFor(totalBytes);
  const newLarge = previousSnapshot ? records.filter((record) => !previousSnapshot[record.path] && record.size >= LARGE_OBJECT_BYTES) : [];
  const duplicateGroupList = [...getDuplicateGroups(records).values()];
  const previousDuplicateEtags = previousSnapshot ? new Set([...getDuplicateGroups(Object.values(previousSnapshot)).keys()]) : new Set<string>();
  const newDuplicateGroups = previousSnapshot ? duplicateGroupList.filter((group) => group[0]?.etag && !previousDuplicateEtags.has(group[0].etag)) : [];
  const watchSignals = records.filter((record) => record.size >= LARGE_OBJECT_BYTES || record.path.toLowerCase().match(/(?:_temp|test|backup|old|archive|version|package|zip)/));
  const products = activeProducts(values);
  const recordPaths = new Set(records.map((record) => record.path));
  const activeDetails: string[] = [];
  let activeStatus = "PASS";
  for (const product of products) {
    if (!product.enabled) {
      activeDetails.push(`${product.product}: not active in current production configuration; no active-path failure asserted.`);
      continue;
    }
    const missing = product.paths.filter((path) => !recordPaths.has(path));
    if (missing.length) {
      activeStatus = "CRITICAL — ACTIVE DELIVERY OBJECT MISSING";
      activeDetails.push(`${product.product}: missing ${missing.length} mapped object(s): ${missing.map((path) => `\`${path}\``).join(", ")}`);
    } else activeDetails.push(`${product.product}: ${product.paths.length} mapped object(s) present.`);
  }
  const checkedAt = new Date().toISOString();
  const notes = [
    `p18_discrepancy=${p18Discrepancy(records)}`,
    `previous_snapshot=${previousTotals?.checkedAt ?? "none"}`,
    `new_duplicate_groups=${newDuplicateGroups.length}`,
  ].join("; ");
  const row = [
    checkedAt,
    totalBytes,
    formatGb(totalBytes),
    records.length,
    previousTotals ? totalBytes - previousTotals.totalBytes : "",
    previousTotals ? formatGb(Math.abs(totalBytes - previousTotals.totalBytes)) : "",
    previousTotals && previousTotals.totalBytes > 0 ? (((totalBytes - previousTotals.totalBytes) / previousTotals.totalBytes) * 100).toFixed(4) : "",
    status,
    Math.max(...records.map((record) => record.size), 0),
    JSON.stringify(newLarge.map((record) => record.path)),
    JSON.stringify(newDuplicateGroups.map((group) => group.map((record) => record.path))),
    activeStatus,
    notes,
  ].map(csv).join(",");
  if (!existsSync(HISTORY_PATH)) writeFileSync(HISTORY_PATH, `${HISTORY_HEADER}\n`, "utf8");
  appendFileSync(HISTORY_PATH, `${row}\n`, "utf8");
  writeFileSync(OBJECT_SNAPSHOT_PATH, `${JSON.stringify(currentSnapshot, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_PATH, renderReport({ checkedAt, records, previous: previousTotals, status, newLarge, currentDuplicateCandidates: duplicateGroupList, newDuplicateCandidates: newDuplicateGroups, activeStatus, activeDetails, discrepancy: p18Discrepancy(records), watchSignals }), "utf8");
  console.log(JSON.stringify({ project: PRODUCTION_PROJECT, bucket: BUCKET, checkedAt, totalBytes, totalGb: formatGb(totalBytes), objectCount: records.length, thresholdStatus: status, deltaBytes: previousTotals ? totalBytes - previousTotals.totalBytes : null, newLargeObjects: newLarge.map((record) => record.path), newDuplicateGroups: newDuplicateGroups.length, activeReferenceStatus: activeStatus, p18Discrepancy: p18Discrepancy(records), readOnly: true }, null, 2));
  if (activeStatus !== "PASS") process.exitCode = 2;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
