import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertApprovedStagingSupabaseTarget } from "@/lib/supabase/environment";

const envPath = path.resolve(".env.staging.local");
if (!fs.existsSync(envPath)) {
  throw new Error("Missing .env.staging.local. Refusing to start against another environment.");
}

const values = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
  const match = /^\s*([A-Z0-9_]+)=(.*)$/.exec(line);
  return match ? [[match[1], match[2].trim().replace(/^['\"]|['\"]$/g, "")]] : [];
}));
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !values[key]);
if (missing.length) throw new Error(`Missing staging values: ${missing.join(", ")}.`);

assertApprovedStagingSupabaseTarget(values.SUPABASE_URL);
assertApprovedStagingSupabaseTarget(values.NEXT_PUBLIC_SUPABASE_URL);

// Staging must use the test-mode values in .env.staging.local and never
// inherit live-only Stripe settings from .env.local. P18 activation remains
// opt-in through the staging-only checkout flag.
const stagingSafetyOverrides = {
  STRIPE_LIVE_WEBHOOK_SECRET: "",
  STRIPE_P18_LIVE_PRICE_ID: "",
};

const port = process.argv[2] ?? "3001";
if (!/^\d{4,5}$/.test(port)) throw new Error("Usage: npm run dev:staging [-- 3001]");

const child = spawn(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32"
  ? ["/d", "/s", "/c", "npx next dev --port", port]
  : ["next", "dev", "--port", port], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...values,
    ...stagingSafetyOverrides,
    NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
    NEXT_PUBLIC_STAGING_AUTH_TEST: "true",
    NEXT_DIST_DIR: ".next-staging",
    POKOPIA_CUMULATIVE_CHECKOUT_ENABLED: "true",
  },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
