# Pokopia Responsive Design System

This describes the current source-defined system and a proposed reusable specification. Proposed changes are clearly marked; no CSS or component changes are made by this audit.

## Current responsive evidence

The funnel shell is `focused-funnel` with page-specific classes in `app/globals.css`. P18 has explicit layout changes at 1120px, 820px, and 520px (`app/globals.css:714-717`, `:764-766`). Completionist has corresponding mobile rules (`app/globals.css:683-711`). The source contains mobile-specific stacking, full-width actions, reduced scene dimensions, and smaller typography.

The repository contains screenshot artifacts named `mobile-*-390.png`, plus `mobile-start-390.png`, `mobile-p18-390.png`, `mobile-p17-390.png`, `mobile-checkout-390.png`, and related files. Their presence is evidence of artifacts, not proof that every current route rendered correctly. No complete visual test is claimed here for 320, 360, 375, 390, or 430px.

## Viewport QA matrix

| Viewport | Required checks | Evidence status |
|---|---|---|
| 320px | No horizontal overflow; CTA readable; preview not clipped; focus visible | NOT VERIFIED by rendered audit |
| 360px | Same plus headline wrapping and price/CTA order | NOT VERIFIED |
| 375px | Existing automated mobile overflow coverage is available; rerun before implementation | Source/test artifact, current render not re-audited |
| 390px | Existing screenshot artifacts; compare against source after any change | Artifact exists; visual interpretation not asserted |
| 430px | Expanded hero/preview proportions and touch spacing | NOT VERIFIED by rendered audit |
| Tablet | 520/820 breakpoint transitions; stacked scene and readable proof panels | Source-inspected; full visual pass NOT VERIFIED |
| Desktop | 1120 breakpoint, two-column hero balance, scene legibility | Source-inspected; full visual pass NOT VERIFIED |

## Reusable tokens

Proposed tokens should be extracted from existing CSS values rather than introducing a new visual language:

- Spacing: 4/8/12/16/24/32/48/64px scale.
- Content width: current `min(100% - Npx, max-width)` pattern.
- Radius: pill actions, 12–30px cards/scenes as already used.
- Typography: uppercase eyebrow/CTA labels, large condensed headline, readable sentence-case supporting copy.
- Color: preserve existing purple/cream/lilac surfaces and contrast-tested action colors.
- Motion: respect `prefers-reduced-motion`; do not make scrolling or scene animation required for comprehension.

## Layout rules

### Funnel shell

- Keep a single main landmark and one logical H1 per stage.
- Keep progress indicator before stage content and expose current step with `aria-current`.
- Preserve legacy redirects and access-recovery links.

### Offer hero

- Desktop: copy/price/CTA column paired with preview scene.
- Tablet: retain two columns only when the CTA and headline remain readable.
- Mobile: copy → price → primary CTA → secondary skip → preview → proof; avoid placing the primary CTA after a long scene.
- Keep cart totals server-derived; responsive presentation must never calculate eligibility or price.

### Images and previews

- Preserve actual PDF-page previews as proof assets.
- Use meaningful alt text for informative pages; empty alt only for genuinely decorative backgrounds.
- Avoid relying on tiny text inside a collage; pair every collage with a textual contents summary.
- Confirm image dimensions and loading priority after any redesign; do not download private PDFs into the public bundle.

### Controls

- Minimum touch target: 44 CSS px in both dimensions.
- Keep one visually dominant action per stage.
- Proposed CTA copy may become outcome-specific, but action semantics and server action names remain unchanged.
- Disabled states must explain readiness failures through an accessible status message.

## Accessibility checklist

- Keyboard order follows visual intent.
- Focus is visible against purple and image backgrounds.
- Labels remain visible; placeholders are not labels.
- Errors and async status use `role=alert`/`role=status` appropriately.
- Progress is announced and not conveyed by color alone.
- Headings are hierarchical; proof cards do not use hidden headings as the only explanation.
- Text over hero imagery passes contrast checks.
- Reduced-motion users receive a static equivalent.
- Email form supports `autocomplete=email` and clear validation.

## Proposed wireframe standard

```text
[brand + progress]
[eyebrow]
[outcome headline]
[one-sentence value proposition]
[price / formats / digital-only]
[primary CTA]
[secondary skip or recovery action]
[actual product preview]
[benefits / contents]
[trust and access reassurance]
```

This is a proposed reusable pattern, not the current implementation. Validate it page by page before changing any route.

## Validation procedure

For future implementation work, run automated overflow checks and rendered screenshots at 320/360/375/390/430px, tablet widths around 520/820px, and desktop widths around 1120/1440px. Verify keyboard traversal, screen-reader landmarks, focus, reduced motion, image loading, and CTA visibility. Roll back a page-level variant if overflow, accessibility regressions, slower first interaction, or checkout-step abandonment diagnostics worsen.

## References

- Next.js Server/Client Component boundary: [official guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- Webflow responsive landing-page guidance: [landing page optimization](https://webflow.com/blog/landing-page-optimization).
- Baymard checkout research methodology: [checkout usability research](https://baymard.com/research/checkout-usability).
