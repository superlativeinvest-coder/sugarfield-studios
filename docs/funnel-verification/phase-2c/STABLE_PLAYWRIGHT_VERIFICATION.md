# Stable Playwright Verification

Status: PASS for isolated local browser regression; external staging is outside this run.

## Scope and environment

The existing Chromium suite in `tests/e2e/` was run serially against the `webServer` declared in `playwright.config.ts`. The test server now supplies deliberately unreachable local Supabase values, test-only Stripe values, blank MailerLite values, and `POKOPIA_CUMULATIVE_CHECKOUT_ENABLED=false`. This prevents `.env.local` provider credentials from being used by browser regression work.

This is a test-infrastructure safeguard only. It does not change application runtime behavior or production configuration.

## Exact result

`npx playwright test tests/e2e --workers=1 --retries=0 --reporter=line`

- Result: **33 passed, 0 failed, 0 skipped** in 3.4 minutes.
- Server: one Playwright-managed `next dev` process on port 3100.
- The server logged expected local `TypeError: fetch failed` analytics insert attempts. They targeted the unreachable test endpoint and did not cause a test failure or an external write.
- The earlier persistent-dev run also passed 33/33. A production-mode replay failed 9 P18 preview-fixture tests because `?preview=1` is deliberately disabled when `NODE_ENV=production`; this is a fixture-mode mismatch, not a product regression.

## Coverage verified

- Consent controls, persistence, keyboard behavior, and Pixel gating: `tests/e2e/pokopia-phase-2a-2.spec.ts`.
- Start-page responsive controls, claim/recovery separation, errors, final CTA focus, and all required widths: `tests/e2e/pokopia-phase-2b.spec.ts`.
- Existing access/recovery: `tests/e2e/pokopia-start.spec.ts`.
- Mobile no-overflow smoke coverage: `tests/e2e/pokopia-mobile.spec.ts`.

## Sources inspected

- `playwright.config.ts`
- `tests/e2e/pokopia-phase-2a-2.spec.ts`
- `tests/e2e/pokopia-phase-2b.spec.ts`
- `tests/e2e/pokopia-mobile.spec.ts`
- `tests/e2e/pokopia-start.spec.ts`

## Limitation and next action

Playwright uses authorized local preview fixtures for the gated P18/P17 screens. It does not prove a paid staging journey, webhook receipt, or delivery. Those remain blocked pending separately authorized synthetic staging transactions.

Rollback: revert the `playwright.config.ts` test-environment-only change; no staging or production data cleanup is involved.
