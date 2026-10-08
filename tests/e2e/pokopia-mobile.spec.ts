import { expect, test } from "@playwright/test";

const routes = [
  "/pokopia/start",
  "/pokopia/daily-reset",
  "/pokopia/companion",
  "/pokopia/complete-player-system?preview=1",
  "/pokopia/completionist-kit?preview=1",
];

for (const width of [375, 390, 430]) {
  test(`funnel pages fit a ${width}px mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/pokopia/quick-start/access", (route) => route.fulfill({ json: { accessGranted: false } }));
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} has horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}
