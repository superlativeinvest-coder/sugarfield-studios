import { expect, test, type Page } from "@playwright/test";

const CONSENT_KEY = "sugarfield_consent_v1";
const widths = [320, 360, 375, 390, 430, 768, 820, 1120, 1440];
const routes = [
  { name: "Start", path: "/pokopia/start", cta: "GET THE FREE QUICK START PACK" },
  { name: "P06", path: "/pokopia/daily-reset", cta: "BUY" },
  { name: "P16", path: "/pokopia/companion", cta: "BUY" },
  { name: "P18", path: "/pokopia/complete-player-system?preview=1", cta: "BUY", selector: ".p18-hero__actions .action-link--primary" },
  { name: "P17", path: "/pokopia/completionist-kit?preview=1", cta: "BUY", selector: ".completionist-hero__actions .action-link--primary" },
  { name: "Sign-in", path: "/pokopia/sign-in", cta: "SEND SIGN-IN LINK" },
  { name: "Recover", path: "/pokopia/recover", cta: "RETURN TO SECURE ACCESS", selector: ".focused-funnel__actions .action-link--primary" },
];

async function isolateConsent(page: Page) {
  await page.route("**/api/pokopia/quick-start/access", (route) => route.fulfill({ json: { accessGranted: false } }));
  await page.route("**/api/privacy/advertising-consent", (route) => route.fulfill({ status: 200, json: { ok: true } }));
  await page.route("https://analytics.tiktok.com/**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "window.ttq = window.ttq || [];" }));
  await page.goto("/pokopia/start");
  await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
}

async function chooseConsent(page: Page, choice: "Reject advertising" | "Allow advertising") {
  const button = page.getByRole("button", { name: choice, exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByRole("button", { name: "Privacy choices", exact: true })).toBeVisible();
}

test.describe("Phase 2A.2 consent behavior", () => {
  test("undecided visitors see both actions and mouse choices persist", async ({ page }) => {
    await isolateConsent(page);
    await page.goto("/pokopia/start");
    await expect(page.getByRole("button", { name: "Reject advertising", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Allow advertising", exact: true })).toBeVisible();
    await chooseConsent(page, "Reject advertising");
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").advertising, CONSENT_KEY)).toBe("denied");
    await page.getByRole("button", { name: "Privacy choices", exact: true }).click();
    await expect(page.getByRole("button", { name: "Allow advertising", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Allow advertising", exact: true }).click();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").advertising, CONSENT_KEY)).toBe("granted");
    await page.reload({ waitUntil: "networkidle" });
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").advertising, CONSENT_KEY)).toBe("granted");
  });

  test("keyboard consent choices have visible focus and do not activate Pixel before consent", async ({ page }) => {
    await isolateConsent(page);
    await page.goto("/pokopia/start");
    await expect(page.locator('script[data-sugarfield-tiktok-pixel="playwright-test-pixel"]')).toHaveCount(0);
    const reject = page.getByRole("button", { name: "Reject advertising", exact: true });
    await reject.focus();
    await expect(reject).toBeFocused();
    await expect(reject).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Privacy choices", exact: true })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").advertising, CONSENT_KEY)).toBe("denied");
    await page.getByRole("button", { name: "Privacy choices", exact: true }).click();
    const allow = page.getByRole("button", { name: "Allow advertising", exact: true });
    await allow.focus();
    await page.keyboard.press("Enter");
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").advertising, CONSENT_KEY)).toBe("granted");
    await expect(page.locator('script[data-sugarfield-tiktok-pixel="playwright-test-pixel"]')).toHaveCount(1);
  });
});

test.describe("Phase 2A.2 consent and CTA hit testing", () => {
  for (const width of widths) {
    test(`all required routes remain operable at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 844 });
      await isolateConsent(page);
      for (const route of routes) {
        await page.goto(route.path);
        const consent = page.locator(".consent-control__panel");
        await expect(consent).toBeVisible();
        const actions = [page.getByRole("button", { name: "Reject advertising", exact: true }), page.getByRole("button", { name: "Allow advertising", exact: true })];
        for (const action of actions) {
          const box = await action.boundingBox();
          expect(box, `${route.name} consent action missing at ${width}px`).not.toBeNull();
          expect(box!.width).toBeGreaterThanOrEqual(40);
          expect(box!.height).toBeGreaterThanOrEqual(40);
          await action.focus();
          await expect(action).toBeFocused();
        }
        const cta = route.selector ? page.locator(route.selector) : page.getByRole("button", { name: route.cta, exact: true }).first();
        await expect(cta).toBeVisible();
        await cta.scrollIntoViewIfNeeded();
        const result = await cta.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, hit: hit === element || element.contains(hit), top: rect.top, bottom: rect.bottom, viewportHeight: window.innerHeight };
        });
        expect(result.overflow, `${route.name} horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
        expect(result.hit, `${route.name} CTA center is obstructed at ${width}px`).toBe(true);
        expect(result.bottom).toBeGreaterThan(0);
        expect(result.top).toBeLessThan(result.viewportHeight);
        await chooseConsent(page, "Reject advertising");
        await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
      }
    });
  }
});

test.describe("Phase 2A.2 rendered error announcements", () => {
  test("signup failure has one scoped alert and keyboard submission works", async ({ page }) => {
    await isolateConsent(page);
    await page.route("**/api/pokopia/funnel/start", (route) => route.fulfill({ status: 503, json: { error: "Synthetic signup failure." } }));
    await page.goto("/pokopia/start");
    await chooseConsent(page, "Reject advertising");
    const form = page.locator(".quick-start-hero form");
    await form.getByLabel("Email address").fill("synthetic@example.test");
    await form.getByRole("button", { name: "GET THE FREE QUICK START PACK", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(form.getByRole("alert")).toHaveCount(1);
    await expect(form.getByRole("alert")).toHaveText("Synthetic signup failure.");
    await expect(page.locator("#quick-start-access").getByRole("alert")).toHaveCount(0);
  });

  test("existing-access failure has one scoped alert and never leaks to signup", async ({ page }) => {
    await isolateConsent(page);
    await page.route("**/api/auth/magic-link", (route) => route.fulfill({ status: 503, json: { error: "Synthetic access failure." } }));
    await page.goto("/pokopia/start#quick-start-access");
    await chooseConsent(page, "Reject advertising");
    const access = page.locator("#quick-start-access");
    await access.getByLabel("Email address").fill("synthetic@example.test");
    await access.getByRole("button", { name: "EMAIL MY SECURE ACCESS LINK", exact: true }).press("Enter");
    await expect(access.getByRole("alert")).toHaveCount(1);
    await expect(access.getByRole("alert")).toHaveText("Synthetic access failure.");
    await expect(page.locator(".quick-start-hero form").getByRole("alert")).toHaveCount(0);
  });
});
