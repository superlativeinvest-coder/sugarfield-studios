# Pokopia Funnel — Mobile and Desktop Visual Verification

Audit date: 2026-10-08. Read-only local staging verification. No production deployment, live charge, production email, production database record, or customer access change was performed.

## Method and evidence boundary

- Local server: `npm run dev:staging -- 3100`, guarded by `scripts/dev-staging.ts:1-34` to the approved staging Supabase project and test Stripe configuration.
- Browser: Playwright Chromium through `tests/e2e` configuration (`playwright.config.ts:1-12`).
- Routes captured: Start, P06 Daily Reset, P16 Adventure Companion, P18 Complete Player System preview, P17 Completionist Kit preview, Complete, Sign-in, Recover, and the checkout gate.
- Viewports: 320, 360, 375, 390, 430, 768, 820, 1120, and 1440 CSS pixels wide at 900px high.
- Capture set: 81 screenshots in `_TEMP/visual-verification/` (`9 routes × 9 widths`). The temporary Playwright spec was deleted after capture and is not a product change.
- P18/P17 used the existing development-only `?preview=1` route behavior in `app/pokopia/complete-player-system/page.tsx:16-29` and `app/pokopia/completionist-kit/page.tsx:13-21`; no eligibility check was weakened.
- Browser-only journey/access requests were intercepted for the screenshot run to avoid creating synthetic staging rows. The checkout page was not forced past its server gate.

The captures are rendered evidence. Manual inspection covered representative 320px, 390px, and 1440px screenshots; the full matrix also received programmatic overflow/heading/CTA checks. No visual claim is made for a viewport outside this matrix.

## Result summary

| Check | Result |
|---|---|
| Horizontal overflow | Pass: `scrollWidth - clientWidth` was 0 for every route and viewport |
| H1 presence | Pass for every captured route/viewport |
| Primary CTA/next-action present | Pass in DOM and non-zero layout box for every route/viewport |
| Actual product previews | Pass on P06, P16, P17, P18, and Quick Start surfaces |
| Keyboard traversal | Pass: focus moved through links, buttons, inputs, and controls; no trap observed |
| Error-state announcement | Pass, with a duplication finding described below |
| Checkout UI | Blocked by intended server gate without an existing unpaid journey fixture |
| Consent overlay | Finding: first-visit advertising-consent panel occludes content/controls at some widths |

## Screenshot evidence

Representative captures:

| Surface | 320px | 390px | 1440px |
|---|---|---|---|
| Start | ![Start 320](_TEMP/visual-verification/320-start.png) | ![Start 390](_TEMP/visual-verification/390-start.png) | ![Start 1440](_TEMP/visual-verification/1440-start.png) |
| P06 | ![P06 320](_TEMP/visual-verification/320-p06.png) | ![P06 390](_TEMP/visual-verification/390-p06.png) | ![P06 1440](_TEMP/visual-verification/1440-p06.png) |
| P16 | ![P16 320](_TEMP/visual-verification/320-p16.png) | ![P16 390](_TEMP/visual-verification/390-p16.png) | ![P16 1440](_TEMP/visual-verification/1440-p16.png) |
| P18 | ![P18 320](_TEMP/visual-verification/320-p18.png) | ![P18 390](_TEMP/visual-verification/390-p18.png) | ![P18 1440](_TEMP/visual-verification/1440-p18.png) |
| P17 | ![P17 320](_TEMP/visual-verification/320-p17.png) | ![P17 390](_TEMP/visual-verification/390-p17.png) | ![P17 1440](_TEMP/visual-verification/1440-p17.png) |
| Checkout gate | ![Checkout 320](_TEMP/visual-verification/320-checkout-gate.png) | ![Checkout 390](_TEMP/visual-verification/390-checkout-gate.png) | ![Checkout 1440](_TEMP/visual-verification/1440-checkout-gate.png) |

The complete capture set is retained locally under `_TEMP/visual-verification/`; it is intentionally not part of the two report files or production bundle.

## Page-by-page findings

### Start — `/pokopia/start`

- Source composition: `PokopiaStarterStage` renders the hero, email capture, existing-access recovery panel, five-page `ProductPreviewFan`, benefits, repeated CTA, trust details, and disclaimer (`components/pokopia/PokopiaStarterStage.tsx:141-145`; `components/pokopia/ProductPreviewFan.tsx:1-12`).
- Rendered finding: the advertising-consent dialog appears over the first-visit experience. At 320px it sits over the hero/email region; at 768/820px the programmatic CTA hit test reports the primary action as occluded.
- Severity: P1 conversion/accessibility friction. The modal is a legitimate consent surface, but its placement can cover the form or CTA before a visitor can act.
- Typography/layout: no clipping or horizontal overflow observed; the headline wraps into readable lines at 320px.
- Preview: actual Quick Start page imagery is visible below the fold; no fake placeholder was observed.

### P06 — `/pokopia/daily-reset`

- Source composition: page wrapper passes cumulative enablement to `PokopiaDailyResetStage` (`app/pokopia/daily-reset/page.tsx:1-5`); offer/preview metadata is in `data/pokopia-funnel.ts:23-26`.
- Rendered finding: hero, $4.99 price, checklist preview, benefits, BUY/SKIP, setup summary, and proof sections remain readable at captured widths.
- Severity: P2. Literal `BUY`/`SKIP` labels are visible but do not state the resulting cart action; this is a comprehension hypothesis, not a transaction defect.
- Preview: actual Daily Reset page imagery and proof panels rendered.

### P16 — `/pokopia/companion`

- Source composition and assets are explicit in `components/pokopia/PokopiaCompanionStage.tsx:15-52`: Event Tracker, Spawn Tracker, Cloud Islands Planner, Field Guide, and Adventure Dashboard.
- Rendered finding: the five-page collage is visible and responsive; no horizontal overflow.
- Severity: P2 visual density. On narrow screens the consent dialog covers part of the offer area, while the collage itself remains readable.
- Accessibility: preview images have descriptive alt text in source.

### P18 — `/pokopia/complete-player-system?preview=1`

- Source composition: server gate normally checks journey/historical eligibility (`app/pokopia/complete-player-system/page.tsx:16-29`); preview is development-only. Stage renders price/chips/benefits/cart/BUY-SKIP, multi-document hero, four proof panels, and trust strip (`components/pokopia/PokopiaCompletePlayerSystemStage.tsx:67-100`).
- Rendered finding: desktop composition is visually strong and all preview panels render. At mobile widths the hero becomes a long vertical sequence, but no clipping/overflow was found.
- Severity: P2 hierarchy risk. The large scene and four proof panels create substantial scroll before the visitor reaches the end of the offer; this is an optimization question, not a broken control.
- Consent dialog: covers part of the hero scene at 390px and the lower-right hero region at 1440px, but the primary BUY button remained hit-testable in the captured run.

### P17 — `/pokopia/completionist-kit?preview=1`

- Source composition: gated by `canViewP17Downsell` in `app/pokopia/completionist-kit/page.tsx:13-21`; stage renders Field Guide, four example cards, proof panels, and trust strip (`components/pokopia/PokopiaCompletionistStage.tsx:44-67`).
- Rendered finding: at 320/360/375/390/430px the consent dialog occluded the primary action hit target (`primaryOccluded: true`).
- Severity: P1. This is the clearest captured CTA-blocking issue.
- Content finding: the offer promises 26 cards but visually shows four examples. The page should label them as examples while keeping the 26-card promise explicit.

### Checkout — `/pokopia/checkout`

- Server behavior is correct and intentionally fail-closed: `app/pokopia/checkout/page.tsx:6-15` redirects without cumulative enablement, an unpaid journey, or paid selection.
- Captured result: HTTP 307 to `/pokopia/recover?reason=checkout-unavailable`; screenshot evidence is the safe recovery state, not a fabricated checkout page.
- Severity: P0 evidence gap for visual verification, not a code defect. A non-mutating authorized unpaid-journey fixture is still required to capture the actual checkout review surface.

### Complete — `/pokopia/complete`

- `PokopiaCompleteStage` renders a completion message and return CTA (`components/pokopia/PokopiaCompleteStage.tsx:8-12`).
- Rendered finding: readable, no overflow, CTA visible. No product preview is expected on this terminal page.

### Sign-in — `/pokopia/sign-in`

- The route uses `CustomerSignInForm` with passwordless explanation and return link (`app/pokopia/sign-in/page.tsx:1-4`).
- Rendered finding: form labels, input, primary button, and back link are visible. At 320px the consent dialog occluded the primary action hit target.
- Severity: P1 when consent is undecided; P2 otherwise. Keyboard traversal reached the link, buttons, and inputs.

### Recover — `/pokopia/recover?reason=offer-unavailable`

- Rendered finding: recovery reason is announced in a status paragraph and the secure-access CTA is visible. No overflow observed.
- Severity: no blocking visual issue found.

## Keyboard and error-state verification

The synthetic keyboard test at 390px produced focus sequence `A, BUTTON, BUTTON, A, INPUT, BUTTON, INPUT, BUTTON, BUTTON, BUTTON, NEXTJS-PORTAL, BODY` and passed. No focus trap was observed.

When `/api/pokopia/funnel/start` was intercepted with a synthetic 503, the form announced the error through `role=alert`. The DOM contained duplicate “Synthetic staging error” alerts in the form and existing-access region, plus the Next route announcer.

- Severity: P2 accessibility/noise issue.
- Evidence: Playwright test failure initially surfaced three matching alert nodes; the scoped form alert then passed.
- Requirement: ensure one authoritative form error announcement per failed submission, or clearly scope each message to its owning region.

## Blockers before Phase 2A design work

1. Resolve or consciously accept consent-dialog occlusion on Start, P17, Sign-in, and some tablet captures.
2. Capture the actual checkout review page with a pre-existing or explicitly authorized non-production unpaid journey fixture. Do not bypass server gates in production.
3. Clean up duplicate async error announcements.
4. Preserve the existing P18/P17 server gates and do not use preview query parameters outside local development.

## Tests run

- Existing Playwright tests: `tests/e2e/pokopia-mobile.spec.ts` and `tests/e2e/pokopia-start.spec.ts`: **5 passed**.
- New read-only capture run: **9 passed**, covering all nine widths and nine route surfaces; 81 screenshots.
- Keyboard/error-state test: **1 passed** after scoping the expected alert.
- Staging readiness: `npm run staging:check`: **READY**, test Stripe, approved staging Supabase, required migration/linkage present.

No live checkout, live charge, production email, production database mutation, or production customer-access operation was performed.
