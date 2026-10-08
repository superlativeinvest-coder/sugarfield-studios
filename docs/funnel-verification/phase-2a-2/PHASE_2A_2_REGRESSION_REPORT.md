# Pokopia Phase 2A.2 Regression Report

## Outcome

**PASS (isolated verification); no deployment performed.** The committed Phase 2A.1 consent and scoped-error repairs were exercised through rendered Playwright flows. The only runtime change in this phase is a minimal pointer-events correction for the already-fixed-position consent manage button.

The consent UI is **non-modal and fixed-position**, not inline-flow. It remains privacy-safe: advertising tracking is not initialized until affirmative consent is recorded.

## Scope and source evidence

- `components/privacy/ConsentBanner.tsx:20-60` remains the consent implementation. It renders a non-modal `role="region"` panel with explicit Reject and Allow actions, persists through `setAdvertisingConsent`, and exposes Privacy choices after a decision.
- `components/analytics/TikTokPixelLoader.tsx` and `lib/privacy/consent.ts` remain unchanged. Existing consent gating and versioned persistence were tested; no advertising request was sent because the test intercepted `https://analytics.tiktok.com/**`.
- `app/globals.css:123-163` keeps the fixed panel, safe-area offsets, scrollable narrow viewport panel, pointer-event isolation, and 42px action targets. Phase 2A.2 adds `pointer-events: auto` at line 132 to the fixed `Privacy choices` manage button; the wrapper remains non-interactive outside the panel.
- `playwright.config.ts:7` gives the browser harness an isolated `.next-e2e` build and synthetic Pixel configuration. It does not change production configuration.
- `tests/e2e/pokopia-phase-2a-2.spec.ts:1-130` is the permanent regression suite.

No funnel eligibility, BUY/SKIP, pricing, checkout, entitlement, download authorization, database, payment, or customer-access code was changed.

## Browser coverage

The new suite contains 13 tests:

| Coverage | Tests | Result |
| --- | ---: | --- |
| Consent mouse persistence and Privacy choices | 1 | PASS |
| Consent keyboard focus, rejection, grant, Pixel gating | 1 | PASS |
| Route/CTA hit testing at 320, 360, 375, 390, 430, 768, 820, 1120, 1440px | 9 | PASS (63 route checks) |
| Rendered signup error isolation | 1 | PASS |
| Rendered existing-access error isolation | 1 | PASS |
| **Total** | **13** | **13 passed, 0 failed, 0 skipped** |

The viewport tests visit Start, P06, P16, P18 preview, P17 preview, Sign-in, and Recover. Each route checks both consent action bounding boxes (at least 40×40), keyboard focus, document overflow, CTA center-point `elementFromPoint` hit testing, and viewport intersection. P18/P17 use the existing preview routes and do not bypass eligibility; unavailable gated BUY states are tested for unobstructed primary action geometry.

The error tests intercept only local synthetic 503 responses, submit the actual forms with keyboard input, and assert exactly one scoped `role="alert"` with no cross-form leakage.

## Regression command results

- `npx playwright test tests/e2e/pokopia-phase-2a-2.spec.ts --reporter=line`: **13 passed**.
- Existing Playwright tests, isolated to `tests/e2e/pokopia-mobile.spec.ts tests/e2e/pokopia-start.spec.ts --workers=1`: **5 passed**.
- A combined 18-test run initially reported **16 passed / 2 failed** due Next dev-server `ECONNRESET`/timeout contention when legacy and new suites ran concurrently. The two affected tests passed in the isolated rerun; no product assertion failed in the isolated runs.
- `npm test`: **140 passed, 0 failed, 0 skipped**.
- `npm run build`: **PASS**; production build compiled and generated 38 static pages.
- `npm run lint`: **PASS** with one existing warning in `scripts/create-p16-v3-and-p18-v4-manifests.mjs` (`join` unused), zero errors.
- `npm run typecheck`: **BLOCKED by pre-existing working-tree `tsconfig.json` configuration** that includes missing `.next-local/types/**/*.ts` files. `tsconfig.json` was not changed or staged in this phase.

## Privacy and interaction assertions

- Undecided visitors see both Reject and Allow.
- Reject persists `advertising: "denied"`; Allow persists `advertising: "granted"`.
- Privacy choices reopens the panel for returning visitors.
- Keyboard focus is visible and both decisions work by Enter.
- No TikTok Pixel script is present before consent or after rejection; one synthetic Pixel script appears only after Allow.
- External TikTok requests are intercepted; no advertising request is made.
- The manage button remains clickable despite the wrapper's intentional `pointer-events: none`.

## Remaining gaps

1. The full combined Playwright command is sensitive to the local Next development server under concurrent route suites; CI should run the isolated suite commands or use a stable production server. This is test-environment behavior, not a product failure.
2. Typecheck requires the unrelated `.next-local`/`tsconfig.json` working-tree configuration to be repaired or generated before it can be green.
3. No live checkout, payment, email delivery, production storage, or deployment validation was performed. Those remain outside Phase 2A.2.

## Rollback

To roll back this phase, revert the dedicated follow-up commit. That removes the new Playwright suite, harness-only environment settings, report, and the single `pointer-events: auto` rule. The prior Phase 2A.1 commit remains intact. Test artifacts and local `.next-e2e` output can be removed independently; no staging or production data was created or modified.
