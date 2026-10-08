import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/pokopia/quick-start/access", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { accessGranted: false } });
    return route.fulfill({ json: { accessGranted: true } });
  });
  await page.route("**/api/auth/magic-link", (route) => route.fulfill({ json: { sent: true } }));
});

test("existing-access link targets and focuses the persistent recovery panel", async ({ page }) => {
  await page.goto("/pokopia/start");
  await expect(page.getByRole("heading", { name: "RETURN TO YOUR QUICK START PACK" })).toBeVisible();
  await page.getByRole("link", { name: "Already have access?" }).click();
  await expect(page.locator("#quick-start-access")).toBeFocused();
});

test("passwordless access recovery announces delivery", async ({ page }) => {
  await page.goto("/pokopia/start#quick-start-access");
  await page.getByLabel("Email address", { exact: true }).last().fill("existing@example.com");
  await page.getByRole("button", { name: "EMAIL MY SECURE ACCESS LINK" }).click();
  await expect(page.getByText("Your secure sign-in link is on its way.")).toBeVisible();
});
