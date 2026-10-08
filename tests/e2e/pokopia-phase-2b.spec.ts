import { expect, test, type Page } from "@playwright/test";

const widths = [320, 360, 375, 390, 430, 768, 820, 1120, 1440];
const consent = { analytics: "unknown", advertising: "denied", version: 1 };

async function prepareStart(page: Page) {
  await page.addInitScript((storedConsent) => localStorage.setItem("sugarfield_consent_v1", JSON.stringify(storedConsent)), consent);
  await page.route("**/api/pokopia/quick-start/access", (route) => route.fulfill({ json: { accessGranted: false } }));
  await page.route("**/api/auth/magic-link", (route) => route.fulfill({ json: { sent: true } }));
}

test.describe("Phase 2B Quick Start landing page", () => {
  test("keeps key controls visibly focused with AA-or-better text contrast", async ({ page }) => {
    await prepareStart(page);
    await page.goto("/pokopia/start");
    const input = page.locator("#pokopia-starter-email");
    await input.focus();
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS("outline-style", "solid");
    const ratios = await page.evaluate(() => {
      const luminance = (color: string) => {
        const values = color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
        const channels = values.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const ratio = (foreground: string, background: string) => {
        const [a, b] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
        return (a + 0.05) / (b + 0.05);
      };
      const heading = document.querySelector<HTMLElement>("#quick-start-title")!;
      const button = document.querySelector<HTMLElement>("[data-quick-start-claim-form] button")!;
      return {
        heading: ratio(getComputedStyle(heading).color, "rgb(255, 253, 245)"),
        button: ratio(getComputedStyle(button).color, getComputedStyle(button).backgroundColor),
      };
    });
    expect(ratios.heading).toBeGreaterThanOrEqual(4.5);
    expect(ratios.button).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps one claim form, separate recovery, and approved section sequence", async ({ page }) => {
    await prepareStart(page);
    await page.goto("/pokopia/start");
    await expect(page.locator("[data-quick-start-claim-form]")).toHaveCount(1);
    await expect(page.locator("[data-quick-start-claim-form] input[type=email]")).toHaveCount(1);
    await expect(page.locator("#quick-start-access form")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "START YOUR POKOPIA ADVENTURE ORGANIZED." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "WHEN YOU WANT TO PLAY, NOT WONDER WHAT TO DO NEXT." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SEE WHAT YOU’LL USE BEFORE YOU CLAIM IT." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A SMALL, SECURE START." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A LIGHTWEIGHT GUIDE FOR THE MOMENTS YOU WANT A LITTLE DIRECTION." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "START YOUR NEXT SESSION WITH A SIMPLE PLAN." })).toBeVisible();
    await expect(page.locator(".quick-start-preview-gallery img")).toHaveCount(5);
  });

  test("uses the existing claim endpoint and retains scoped claim errors", async ({ page }) => {
    await prepareStart(page);
    let requests = 0;
    await page.route("**/api/pokopia/funnel/start", (route) => {
      requests += 1;
      return route.fulfill({ status: 503, json: { error: "Synthetic signup failure." } });
    });
    await page.goto("/pokopia/start");
    const form = page.locator("[data-quick-start-claim-form]");
    await form.getByLabel("Email address").fill("not-an-email");
    await form.getByRole("button", { name: "GET MY FREE QUICK START" }).click();
    expect(await form.getByLabel("Email address").evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    expect(requests).toBe(0);
    await form.getByLabel("Email address").fill("synthetic@example.test");
    await form.getByRole("button", { name: "GET MY FREE QUICK START" }).press("Enter");
    await expect(form.getByRole("alert")).toHaveCount(1);
    await expect(form.getByRole("alert")).toHaveText("Synthetic signup failure.");
    await expect(page.locator("#quick-start-access").getByRole("alert")).toHaveCount(0);
    expect(requests).toBe(1);
  });

  test("preserves the successful mocked claim transition", async ({ page }) => {
    await prepareStart(page);
    await page.route("**/api/pokopia/funnel/start", (route) => route.fulfill({ json: { nextRoute: "/pokopia/daily-reset" } }));
    await page.goto("/pokopia/start");
    const form = page.locator("[data-quick-start-claim-form]");
    await form.getByLabel("Email address").fill("player@example.test");
    await form.getByRole("button", { name: "GET MY FREE QUICK START" }).click();
    await page.waitForURL("**/pokopia/daily-reset");
  });

  test("final CTA focuses the original form without submitting or losing input", async ({ page }) => {
    await prepareStart(page);
    let submissions = 0;
    await page.route("**/api/pokopia/funnel/start", (route) => {
      submissions += 1;
      return route.fulfill({ json: { nextRoute: "/pokopia/daily-reset" } });
    });
    await page.goto("/pokopia/start");
    const input = page.locator("#pokopia-starter-email");
    await input.fill("saved@example.test");
    const finalCta = page.locator(".quick-start-final").getByRole("button", { name: "GET MY FREE QUICK START" });
    await finalCta.focus();
    await page.keyboard.press("Enter");
    await expect(input).toBeFocused({ timeout: 2_000 });
    await expect(input).toHaveValue("saved@example.test");
    expect(submissions).toBe(0);
  });

  test("existing-access header link keeps the recovery panel keyboard reachable", async ({ page }) => {
    await prepareStart(page);
    await page.goto("/pokopia/start");
    await page.getByRole("link", { name: "Already have access?" }).click();
    await expect(page.locator("#quick-start-access")).toBeFocused();
    await page.locator("#quick-start-access").getByLabel("Email address").fill("existing@example.test");
    await page.locator("#quick-start-access").getByRole("button", { name: "EMAIL MY SECURE ACCESS LINK" }).press("Enter");
    await expect(page.locator("#quick-start-access").getByRole("alert")).toHaveCount(1);
  });

  for (const width of widths) {
    test("remains usable and complete at " + width + "px", async ({ page }) => {
      await prepareStart(page);
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/pokopia/start");
      const result = await page.locator("[data-quick-start-claim-form] button").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, hit: hit === element || element.contains(hit), width: rect.width, height: rect.height };
      });
      expect(result.overflow).toBeLessThanOrEqual(1);
      expect(result.hit).toBe(true);
      expect(result.width).toBeGreaterThanOrEqual(44);
      expect(result.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator(".quick-start-hero__sheet")).toHaveCount(3);
      await expect(page.locator(".quick-start-preview-gallery img")).toHaveCount(5);
      await expect(page.locator(".quick-start-access-steps li")).toHaveCount(3);
      await expect(page.locator(".quick-start-benefits li")).toHaveCount(4);
      await expect(page.locator(".quick-start-final button")).toBeVisible();
    });
  }
});
