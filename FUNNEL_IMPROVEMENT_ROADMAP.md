# Pokopia Funnel Improvement Roadmap

This roadmap is planning-only. It preserves verified prices, eligibility, entitlement, payment, and download protections. Every item requires a separate implementation approval.

## Prioritization rubric

- Impact is a behavioral hypothesis, not a promised lift.
- Risk considers checkout, authorization, fulfillment, and attribution regressions.
- Effort is relative to the current codebase.
- Testability requires a measurable primary and guardrail metric.

## Ranked recommendations

| Rank | Recommendation | Impact hypothesis | Risk | Effort | Testability |
|---:|---|---|---|---|---|
| 1 | Establish event/order reconciliation dashboard | Missing or duplicated funnel facts currently make UX decisions less reliable | Low | Medium | High |
| 2 | Clarify BUY/SKIP outcome copy while keeping action semantics | Explicit price/outcome language may reduce decision uncertainty | Medium | Low | High |
| 3 | Standardize hero hierarchy and CTA placement | Earlier outcome, price, and CTA visibility may reduce scroll friction | Medium | Medium | High |
| 4 | Make P17’s “26 cards included” proof explicit | Matching promised quantity to visual proof may reduce content uncertainty | Low | Low | High |
| 5 | Reduce mobile preview density without removing real-page proof | A staged proof sequence may improve comprehension on narrow screens | Medium | Medium | High |
| 6 | Strengthen checkout reassurance and return-state copy | Clear digital fulfillment/authentication expectations may reduce checkout hesitation | Medium | Low | Medium |
| 7 | Add controlled headline/preview experiments | Controlled variants can distinguish preference from causal effect | Medium | Medium | High |
| 8 | Accessibility/performance hardening pass | Better focus, contrast, image loading, and reduced motion can reduce non-conversion friction | Low | Medium | Medium |

## Recommendation specifications

### 1. Event/order reconciliation

- Current issue: client and server events coexist; only webhook/order truth proves purchase (`app/api/stripe/webhook/route.ts:61-64`, `lib/analytics/server.ts`).
- Evidence: unique purchase constraint in `supabase/migrations/202609280001_create_phase1_analytics.sql:93-100`.
- Improvement: produce a read-only report joining journey, event, order, entitlement, and download outcomes.
- Mechanism: separates UX drop-off from transaction failures.
- Primary metric: percentage of paid orders with matching canonical purchase event.
- Guardrails: duplicate purchases, missing entitlements, unauthorized downloads, webhook failures.
- Risk/effort: low/medium.
- Validation: fixture orders plus webhook replay and stale-journey cases.
- Rollback: remove report/dashboard only; no runtime path changes.

### 2. CTA language test

- Current issue: stages use literal BUY/SKIP (`PokopiaCompanionStage.tsx:52`, `PokopiaCompletePlayerSystemStage.tsx:78`).
- Evidence: server action names remain `*_accepted`/`*_skipped` (`app/api/pokopia/funnel/journey/route.ts:38-77`).
- Improvement: test descriptive labels such as “Add Daily Reset — $4.99” and “Continue without it.”
- Mechanism: makes consequence and incremental total legible.
- Primary metric: accepted-offer rate per eligible view.
- Guardrails: skip rate, checkout mismatch rate, duplicate action rate, completion rate.
- Risk/effort: low/low.
- Validation: randomized copy variant with identical server actions and price.
- Rollback: restore current labels.

### 3. Hero hierarchy

- Current issue: P18 contains long copy, chips, benefits, cart, CTA, and a complex scene before the value panels (`PokopiaCompletePlayerSystemStage.tsx:67-100`).
- Evidence: mobile stacking begins at 820/520px (`app/globals.css:764-766`).
- Improvement: test shorter value proposition, price/formats, CTA, then preview.
- Mechanism: exposes decision-critical information earlier.
- Primary metric: CTA interaction rate per qualified view.
- Guardrails: scroll depth, page errors, checkout starts, refund/support signals.
- Risk/effort: medium/medium.
- Validation: screenshot and overflow checks at 320/360/375/390/430, tablet, desktop; controlled variant test.
- Rollback: revert page variant without touching route gates.

### 4. P17 contents proof

- Current issue: offer promises 26 cards but hero scene displays four example cards (`PokopiaCompletionistStage.tsx:57-64`).
- Evidence: offer definition says “26 numbered collection cards” (`data/pokopia-funnel.ts:36-40`).
- Improvement: add a concise “26 cards included” contents callout beside the CTA and label examples as previews.
- Mechanism: closes a proof/claim mismatch.
- Primary metric: P17 acceptance rate after qualified P18 skip.
- Guardrails: P17 refund/support contacts and checkout completion.
- Risk/effort: low/low.
- Validation: copy comprehension review plus controlled variant.
- Rollback: remove callout.

### 5. Mobile proof sequencing

- Current issue: P16/P18/P17 use dense collages and large imagery; complete viewport behavior is not verified.
- Evidence: source-defined image scenes and breakpoint rules (`PokopiaCompanionStage.tsx:52`, `PokopiaCompletePlayerSystemStage.tsx:83-97`, `app/globals.css:714-717`).
- Improvement: retain real previews but show a primary page, textual contents, then optional gallery.
- Mechanism: reduces visual competition and improves scanability.
- Primary metric: CTA interaction rate and proof-section engagement by viewport.
- Guardrails: load time, overflow, image errors, accessibility defects.
- Risk/effort: medium/medium.
- Validation: rendered screenshots and keyboard/screen-reader pass at required widths.
- Rollback: restore existing collage order.

### 6. Checkout reassurance

- Current issue: local checkout lists items and total, then sends the visitor to Stripe (`PokopiaCheckoutStage.tsx:7-11`).
- Evidence: secure download requires auth, paid order, customer match, and entitlement (`app/api/orders/[order-id]/downloads/[product-id]/route.ts:9-27`).
- Improvement: explain digital-only delivery, secure account access, and post-payment return before the Stripe CTA.
- Mechanism: addresses access and fulfillment objections without adding fields.
- Primary metric: checkout review → Stripe session creation.
- Guardrails: checkout errors, session reuse mismatch, webhook/order failures.
- Risk/effort: low/low.
- Validation: copy review and checkout fixture tests.
- Rollback: remove reassurance copy.

### 7. Controlled experiments

- Current issue: no evidence in this repository establishes which copy/layout variant performs better.
- Evidence: PostHog experiments rely on feature-flag exposure and existing events ([official docs](https://posthog.com/docs/experiments)).
- Improvement: only after baseline event quality is verified, test one hypothesis at a time.
- Mechanism: separates causal effect from seasonality or traffic mix.
- Primary metric: predeclared stage-specific acceptance or checkout completion.
- Guardrails: eligibility, fulfillment, error, and authorization invariants.
- Risk/effort: medium/medium.
- Validation: exposure integrity, sample-size/statistical design by the analytics owner; no invented threshold here.
- Rollback: disable flag and keep control path.

### 8. Accessibility/performance hardening

- Current issue: many large preview images and `unoptimized` assets are used; source-only review cannot establish final loading or assistive-technology behavior.
- Evidence: P18/P17 image declarations (`PokopiaCompletePlayerSystemStage.tsx:83-97`, `PokopiaCompletionistStage.tsx:57-64`).
- Improvement: audit image sizing/loading, focus, contrast, reduced motion, and semantic reading order.
- Mechanism: reduces non-conversion friction and improves inclusive access.
- Primary metric: accessibility defect count and interaction-ready time.
- Guardrails: preview fidelity, CTA visibility, Core Web Vitals, JS errors.
- Risk/effort: low/medium.
- Validation: automated checks plus manual keyboard/screen-reader and viewport QA.
- Rollback: revert asset/loading changes independently.

## Rules that must not change in UX work

Do not weaken `resolveP18Eligibility`, `canViewP17Downsell`, cumulative normalization/fingerprint validation, Stripe signature checks, order idempotency, private-storage signed URLs, customer/order authorization, or stale-session handling. These are architectural invariants, not conversion experiments.

## Rollout order

1. Read-only analytics reconciliation.
2. Accessibility/performance baseline.
3. CTA and reassurance copy experiments.
4. Hero and proof sequencing experiments.
5. Only then consider broader layout changes.

No recommendation should be implemented until its evidence, acceptance tests, guardrails, and rollback are approved separately.
