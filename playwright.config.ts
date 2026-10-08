import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  // Browser tests must not inherit provider credentials from .env.local. These
  // deliberately unreachable local values keep an accidental unmocked request
  // from reaching Supabase, Stripe, or MailerLite during UI regression runs.
  webServer: { command: "npm run dev -- --port 3100", url: "http://127.0.0.1:3100/pokopia/start", reuseExistingServer: !process.env.CI, env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_TIKTOK_PIXEL_ID: "playwright-test-pixel", NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: "true", NEXT_PUBLIC_TIKTOK_PIXEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100", SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: "playwright-service-role-key", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-anon-key", STRIPE_SECRET_KEY: "sk_test_playwright", STRIPE_WEBHOOK_SECRET: "whsec_playwright", MAILERLITE_API_KEY: "", MAILERLITE_GROUP_ID: "", POKOPIA_CUMULATIVE_CHECKOUT_ENABLED: "false" } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
