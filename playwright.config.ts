import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --port 3100", url: "http://127.0.0.1:3100/pokopia/start", reuseExistingServer: !process.env.CI, env: { NEXT_DIST_DIR: ".next-e2e" } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
