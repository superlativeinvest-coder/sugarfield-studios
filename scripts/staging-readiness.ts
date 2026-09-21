import fs from "node:fs";
import path from "node:path";
import { classifySupabaseTarget, PRODUCTION_SUPABASE_PROJECT_REF, STAGING_SUPABASE_PROJECT_REF } from "@/lib/supabase/environment";
import { P18_STAGED_FULFILLMENT_VERSION } from "@/lib/delivery/p18-staged";

const envPath = path.resolve(".env.staging.local");
const migrationPath = path.resolve("supabase/migrations/202609190001_add_pokopia_accumulated_order.sql");
const linkedProjectPath = path.resolve("supabase/.temp/project-ref");
const productionHostname = "cozygamesguides.com";

function readEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(fs.readFileSync(filePath, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = /^\s*([A-Z0-9_]+)=(.*)$/.exec(line);
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
  }));
}

function present(value: string | undefined): "PRESENT" | "MISSING" { return value ? "PRESENT" : "MISSING"; }
function mode(value: string | undefined): "TEST" | "LIVE" | "UNKNOWN" | "MISSING" {
  if (!value) return "MISSING";
  if (value.startsWith("sk_test_") || value.startsWith("pk_test_")) return "TEST";
  if (value.startsWith("sk_live_") || value.startsWith("pk_live_")) return "LIVE";
  return "UNKNOWN";
}
function report(name: string, value: string | undefined, valueMode = "") { console.log(`${name}: ${present(value)}${valueMode ? ` (${valueMode})` : ""}`); }

const values = readEnv(envPath);
const failures: string[] = [];
console.log("Staging readiness (read-only; no migration/deploy/provider writes)\n");
if (!Object.keys(values).length) failures.push(".env.staging.local is missing or empty.");

const supabaseUrl = values.SUPABASE_URL;
const publicSupabaseUrl = values.NEXT_PUBLIC_SUPABASE_URL;
const serverTarget = classifySupabaseTarget(supabaseUrl);
const browserTarget = classifySupabaseTarget(publicSupabaseUrl);
console.log(`SUPABASE_URL target: ${serverTarget} (${serverTarget === "STAGING" ? STAGING_SUPABASE_PROJECT_REF : serverTarget === "PRODUCTION" ? PRODUCTION_SUPABASE_PROJECT_REF : "unresolved"})`);
console.log(`NEXT_PUBLIC_SUPABASE_URL target: ${browserTarget}`);
if (serverTarget === "PRODUCTION" || browserTarget === "PRODUCTION") failures.push("A production Supabase project is selected.");
if (serverTarget !== "STAGING" || browserTarget !== "STAGING" || supabaseUrl !== publicSupabaseUrl) failures.push(`Both Supabase URLs must match approved staging project ${STAGING_SUPABASE_PROJECT_REF}.`);
report("SUPABASE_SERVICE_ROLE_KEY", values.SUPABASE_SERVICE_ROLE_KEY);
report("NEXT_PUBLIC_SUPABASE_ANON_KEY", values.NEXT_PUBLIC_SUPABASE_ANON_KEY);

report("STRIPE_SECRET_KEY", values.STRIPE_SECRET_KEY, mode(values.STRIPE_SECRET_KEY));
report("STRIPE_WEBHOOK_SECRET", values.STRIPE_WEBHOOK_SECRET);
report("STRIPE_DAILY_RESET_PRICE_ID", values.STRIPE_DAILY_RESET_PRICE_ID);
report("STRIPE_ADVENTURE_COMPANION_PRICE_ID", values.STRIPE_ADVENTURE_COMPANION_PRICE_ID);
report("STRIPE_P17_STANDALONE_PRICE_ID", values.STRIPE_P17_STANDALONE_PRICE_ID);
report("STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID", values.STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID);
if (mode(values.STRIPE_SECRET_KEY) === "LIVE") failures.push("A live Stripe secret key is configured for staging.");
if (mode(values.STRIPE_SECRET_KEY) !== "TEST") failures.push("STRIPE_SECRET_KEY must be a Stripe test secret.");
if (!values.STRIPE_WEBHOOK_SECRET) failures.push("STRIPE_WEBHOOK_SECRET is required for webhook verification.");
for (const key of ["STRIPE_DAILY_RESET_PRICE_ID", "STRIPE_ADVENTURE_COMPANION_PRICE_ID", "STRIPE_P17_STANDALONE_PRICE_ID", "STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID"]) if (!values[key]) failures.push(`${key} is required for accumulated checkout.`);

report("NEXT_PUBLIC_SITE_URL", values.NEXT_PUBLIC_SITE_URL);
if (!values.NEXT_PUBLIC_SITE_URL) failures.push("NEXT_PUBLIC_SITE_URL must point to a non-production staging/preview URL.");
else {
  try {
    const url = new URL(values.NEXT_PUBLIC_SITE_URL);
    if (url.hostname === productionHostname || url.hostname.endsWith(`.${productionHostname}`)) failures.push("NEXT_PUBLIC_SITE_URL targets the production domain.");
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") failures.push("NEXT_PUBLIC_SITE_URL must be HTTPS outside local development.");
  } catch { failures.push("NEXT_PUBLIC_SITE_URL is not a valid URL."); }
}
report("POKOPIA_CUMULATIVE_CHECKOUT_ENABLED", values.POKOPIA_CUMULATIVE_CHECKOUT_ENABLED);
report("P18_ACTIVATION_ENABLED", values.P18_ACTIVATION_ENABLED);
report("P18_STAGED_STORAGE_VERIFIED_VERSION", values.P18_STAGED_STORAGE_VERIFIED_VERSION);
if (values.POKOPIA_CUMULATIVE_CHECKOUT_ENABLED !== "true") failures.push("POKOPIA_CUMULATIVE_CHECKOUT_ENABLED must be true for staging verification.");
if (values.P18_ACTIVATION_ENABLED !== "true") failures.push("P18_ACTIVATION_ENABLED must be true for P18 staging verification.");
if (!values.P18_STAGED_STORAGE_VERIFIED_VERSION) failures.push(`P18_STAGED_STORAGE_VERIFIED_VERSION is required for P18 readiness (approved value: ${P18_STAGED_FULFILLMENT_VERSION}).`);
else if (values.P18_STAGED_STORAGE_VERIFIED_VERSION !== P18_STAGED_FULFILLMENT_VERSION) failures.push("P18_STAGED_STORAGE_VERIFIED_VERSION does not match the approved repository version.");

console.log(`Migration file: ${fs.existsSync(migrationPath) ? "PRESENT" : "MISSING"}`);
if (!fs.existsSync(migrationPath)) failures.push("Accumulated-order migration file is missing.");
const linkedProject = fs.existsSync(linkedProjectPath) ? fs.readFileSync(linkedProjectPath, "utf8").trim() : "";
const linkageStatus = linkedProject === STAGING_SUPABASE_PROJECT_REF ? `LINKED (${STAGING_SUPABASE_PROJECT_REF})` : linkedProject ? `MISMATCHED (${linkedProject})` : "NOT CONFIGURED";
console.log(`Supabase CLI/linkage: ${linkageStatus}`);
if (linkedProject !== STAGING_SUPABASE_PROJECT_REF) failures.push(`Supabase CLI must be linked to approved staging project ${STAGING_SUPABASE_PROJECT_REF}.`);
console.log("Deployment target: " + (values.NEXT_PUBLIC_SITE_URL ? "configured above; preview/non-production URL required" : "MISSING"));

if (failures.length) {
  console.error("\nNOT READY");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nREADY FOR STAGING-ONLY MIGRATION/DEPLOYMENT REVIEW");
}
