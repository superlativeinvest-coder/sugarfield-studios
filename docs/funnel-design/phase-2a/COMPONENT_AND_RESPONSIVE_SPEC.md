# Component and Responsive Specification

## Existing components to preserve

- `PokopiaStarterStage`: retains form submissions, access restoration, server redirect, scoped alerts, and focus behavior.
- `FunnelFrame`: retains header, progress, route analytics, attribution/journey continuity, recovery anchor, and footer.
- `ProductPreviewFan`: remains the source for the five approved preview images.
- `ConsentBanner` and `TikTokPixelLoader`: remain untouched, including non-modal fixed positioning and affirmative-consent gating.

## Proposed presentational composition for Phase 2B

Use presentational sections only: `QuickStartHero`, `QuickStartProblemStrip`, `QuickStartPreviewGallery`, `QuickStartAccessSteps`, `QuickStartBenefits`, and `QuickStartFinalCta`. They consume existing event handlers and assets; they do not own API calls, cookies, storage, pricing, or route logic.

## Breakpoint rules

| Width | Layout |
| --- | --- |
| 320–430 | One column; form before preview art; 52px controls; 12–16px gutters |
| 768–820 | Wider one-column hero or two balanced blocks; 32px gutters; two-column gallery where legible |
| 1120 | Two-column hero; 40px gutters; three problem cards |
| 1440 | 1,160px shell; two-column hero; 64px column gap; full page composition |

All breakpoints preserve labels, visible focus, reduced-motion preference, intrinsic image sizing, and no horizontal overflow. The static mockups are layout specifications only.

## Asset and performance rules

- Use only P01–P05 approved PNGs already served from `public/assets/products/pokopia/quick-start/`.
- Use responsive `sizes`, lazy-load below-hero gallery images, reserve intrinsic aspect ratio, and avoid decorative image duplication in the DOM.
- CSS cloud/mint/lavender decorations may be constructed with CSS; do not generate or alter product pages.

## Approval requirement

Any Phase 2B component change must retain current canonical analytics calls, exact form endpoints, recovery behavior, and accessibility/error semantics.
