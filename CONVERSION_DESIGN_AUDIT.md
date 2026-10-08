# Pokopia Conversion Design Audit

This is a source-and-artifact audit. The repository contains mobile screenshot artifacts, but this document does not claim a complete visual test at every viewport unless explicitly stated. Claims based only on JSX/CSS are marked source-inspected.

## Evidence standard

The current funnel uses a focused shell with progress, no standard site navigation, and a page-specific offer component (`components/pokopia/PokopiaFunnelStage.tsx:14`). Webflow describes landing pages as focused experiences with a primary conversion goal and warns that extra navigation can distract from that goal ([landing pages vs. websites](https://webflow.com/blog/landing-pages-vs-websites)). That is a design principle, not proof of a conversion lift for this funnel.

## Page audits and wireframes

### Start — `/pokopia/start`

**Current source evidence:** `PokopiaStarterStage` renders a hero, email form or access restoration, secure-access panel, five-page real preview fan, benefit list, repeated CTA, trust strip, and disclaimer (`components/pokopia/PokopiaStarterStage.tsx:141-145`). Headline: “START YOUR POKOPIA ADVENTURE ORGANIZED.” Primary CTA: “GET THE FREE QUICK START PACK.” Preview component: `ProductPreviewFan` (`components/pokopia/ProductPreviewFan.tsx:1-12`).

**Current wireframe:**

```text
[Sugarfield wordmark | progress | Already have access?]
[Hero scene] [Free headline + email form]
[Existing access / secure downloads]
[Real 5-page preview fan]
[Benefits → repeat free CTA → trust]
[fan-made disclaimer]
```

**Observed opportunity:** The page offers both lead capture and returning-access recovery. That is useful but creates two competing tasks above the fold. The exact fold behavior at 320/360/375/390/430 is **NOT VERIFIED** from source alone. Recommendation: keep one primary first-visit CTA and move recovery into a clearly secondary panel while retaining the accessible anchor.

### Daily Reset — `/pokopia/daily-reset`

**Current source evidence:** The page passes cumulative enablement into `PokopiaDailyResetStage` (`app/pokopia/daily-reset/page.tsx:1-5`). The offer definition provides P06 price/benefits/preview (`data/pokopia-funnel.ts:23-26`). The stage uses `FunnelFrame`, offer copy, preview imagery, BUY/SKIP, and optional `FunnelCartSummary` (component source inspected; exact section order should be rechecked if the component changes).

**Current wireframe:**

```text
[Wordmark | step 2 of 4]
[P06 headline + description + price]
[Actual checklist preview]
[Benefits]
[Current setup / new total]
[BUY] [SKIP]
[digital/trust reassurance]
```

**Observed opportunity:** Literal “BUY” and “SKIP” are consistent with tests but underspecify outcome and price impact. Hypothesis: “Add Daily Reset — $4.99” and “Continue without it” may reduce uncertainty. This requires an A/B test and must not alter the server action names.

### Adventure Companion — `/pokopia/companion`

**Current source evidence:** `PokopiaCompanionStage` renders bridge copy, P16 headline, description, owned-P06 indicator, price/benefits, cart summary, BUY/SKIP, five proof pages, and trust text (`components/pokopia/PokopiaCompanionStage.tsx:15-52`). Preview assets are P13 event tracker, P15 spawn tracker, P14 Cloud Islands Planner, P05 Field Guide, and P16 Adventure Dashboard.

**Current wireframe:**

```text
[Wordmark | step 3 of 4]
[Bridge from prior choice]
[P16 headline + price + owned P06 badge]
[BUY/SKIP + cart summary]
[Five actual printable previews]
[Instant access / print / Stripe reassurance]
```

**Observed opportunity:** Five previews demonstrate breadth but can become visually dense, especially on narrow screens. Proposed experiment: preserve all assets but introduce a primary “what this solves” panel before a collapsible/detail gallery. Do not infer that the current gallery hurts conversion without scroll/click evidence.

### Complete Player System — `/pokopia/complete-player-system`

**Current source evidence:** The route server-checks current or historical eligibility (`app/pokopia/complete-player-system/page.tsx:16-29`). The stage renders headline, long-form value proposition, regular/funnel price, four chips, benefits, cart summary, BUY/SKIP, large multi-document hero scene, four value panels, and trust strip (`components/pokopia/PokopiaCompletePlayerSystemStage.tsx:67-100`).

**Current wireframe:**

```text
[Wordmark | qualified step]
[Headline + outcome copy + price]
[11-tool / formats chips]
[Benefits + cart + BUY/SKIP]
[Large connected-document scene]
[Four proof/value panels]
[Trust strip]
```

**Observed opportunity:** The hero is information-rich and visually elaborate. At mobile widths the CSS changes to a stacked scene and smaller typography (`app/globals.css:764-766`). Source inspection suggests the primary action remains below several copy blocks; rendered position is **NOT VERIFIED** at every viewport. Test a shorter hero copy variant with the same price and entitlement promise.

### Completionist Kit — `/pokopia/completionist-kit`

**Current source evidence:** The route server-checks `canViewP17Downsell` (`app/pokopia/completionist-kit/page.tsx:13-21`). The stage renders P17 headline, $14.99 price, four benefits, cart summary, BUY/SKIP, Field Guide preview plus four card previews, four proof panels, and trust strip (`components/pokopia/PokopiaCompletionistStage.tsx:44-67`).

**Current wireframe:**

```text
[Wordmark | downsell step]
[Completionist headline + price]
[Benefits + cart + BUY/SKIP]
[Field Guide + four card scene]
[Four proof panels]
[Trust strip]
```

**Observed opportunity:** The offer promises “26-card digital reference collection,” while the hero visually shows four cards. The proof section should make “26 cards included” explicit near the CTA, without implying that only four cards ship.

### Checkout — `/pokopia/checkout`

**Current source evidence:** The server page refuses disabled, empty, completed, or missing journeys (`app/pokopia/checkout/page.tsx:6-15`). `PokopiaCheckoutStage` lists the free pack and paid line items, total, and a single “CONTINUE TO SECURE CHECKOUT” action (`components/pokopia/PokopiaCheckoutStage.tsx:7-11`). Stripe-hosted checkout then handles payment.

**Current wireframe:**

```text
[Wordmark | checkout]
[Your Pokopia order]
[Line items + total]
[Continue to secure checkout]
[Inline error/status]
```

**Observed opportunity:** The local review page is intentionally minimal. Reassurance should state digital-only fulfillment, customer account/download protection, and what happens after Stripe return. Baymard’s published checkout research emphasizes clear linear flows and field/error clarity ([checkout research](https://baymard.com/research/checkout-usability)); Stripe remains the payment authority.

### Complete, Sign-in, Recover

`PokopiaCompleteStage` shows completion copy and returns to Quick Start (`components/pokopia/PokopiaCompleteStage.tsx:8-12`). Sign-in and recover are access-recovery surfaces; they should remain visually subordinate to the purchase path and clearly explain why authentication protects downloads. Exact rendered form behavior is **NOT VERIFIED** without a rendered interaction pass.

## Reusable design specification

| Component | Current reuse | Audit recommendation |
|---|---|---|
| `FunnelFrame` | All canonical stages | Preserve progress, landmark structure, and footer disclaimer |
| `FunnelCartSummary` | P06/P16/P18/P17 | Keep server-derived total; improve plain-language delta copy |
| `ProductPreviewFan` | Quick Start | Preserve real-page proof; add predictable keyboard/focus behavior |
| Offer hero components | P06/P16/P18/P17 | Standardize CTA hierarchy, price, format, and digital-only disclosure |
| Trust strip/status | P16/P18/P17/checkout | Use consistent, concise reassurance and accessible status roles |

## Accessibility and friction findings

- Positive: labeled email inputs, semantic headings, `aria-current` progress, `role=status`/`role=alert`, descriptive preview alt text, and keyboard-capable buttons are present in source.
- Risk: decorative scenes are complex and may compete with reading order; many assets use `unoptimized`, and some background imagery has empty alt text by design. Confirm that meaningful information is not conveyed only by decoration.
- Risk: literal BUY/SKIP labels are consistent but not self-explanatory. Test copy changes independently from state-machine behavior.
- Risk: standard site navigation is suppressed in the focused shell, but the “Already have access?” link is a second task on Start. Keep it accessible while visually secondary.
- Source-only conclusion: viewport-specific overflow cannot be claimed without rendered checks at 320, 360, 375, 390, and 430px.

## Evidence classes

- Published research: Baymard checkout usability methodology and findings; do not generalize every ecommerce finding to this digital funnel.
- Platform recommendation: Next.js server/client boundaries, Stripe hosted Checkout/webhooks, Supabase RLS/private Storage, Clarity behavior analysis, PostHog exposure-based experiments.
- Repository observation: all current behavior and asset inventories above.
- Hypothesis: CTA wording, copy density, gallery sequencing, and reassurance changes; validate with controlled experiments.
