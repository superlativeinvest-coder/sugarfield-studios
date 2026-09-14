import fs from "node:fs";
import path from "node:path";
import { assertApprovedStagingSupabaseTarget, projectRefFromSupabaseUrl, STAGING_SUPABASE_PROJECT_REF } from "@/lib/supabase/environment";

const envPath = path.resolve(".env.staging.local");
if (!fs.existsSync(envPath)) throw new Error("Missing .env.staging.local. Refusing to fall back to another environment file.");

const values = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
  const match = /^\s*([A-Z0-9_]+)=(.*)$/.exec(line);
  return match ? [[match[1], match[2].trim().replace(/^['\"]|['\"]$/g, "")]] : [];
}));
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !values[key]);
if (missing.length) throw new Error(`Missing staging values: ${missing.join(", ")}.`);

const serverRef = assertApprovedStagingSupabaseTarget(values.SUPABASE_URL);
const browserRef = assertApprovedStagingSupabaseTarget(values.NEXT_PUBLIC_SUPABASE_URL);
if (serverRef !== browserRef || serverRef !== STAGING_SUPABASE_PROJECT_REF || projectRefFromSupabaseUrl(values.SUPABASE_URL) !== projectRefFromSupabaseUrl(values.NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error("Staging server and browser Supabase projects must match the approved staging project.");
}
console.log(`Approved staging target: ${serverRef}`);
