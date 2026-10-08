# Current Start Page Audit

## Verified current implementation

- Canonical route: `app/pokopia/start/page.tsx` renders `PokopiaStarterStage` and declares `/pokopia/start` as canonical metadata.
- Aliases: `app/page.tsx` permanently redirects `/` to `/pokopia/start`; `app/pokopia/funnel/start/page.tsx` permanently redirects the legacy funnel URL to `/pokopia/start`.
- `components/pokopia/PokopiaStarterStage.tsx` currently orders: hero/email claim, existing-access recovery, five-page preview, benefit list/repeated CTA, trust strip, and fan-made note.
- Current hero: “START YOUR POKOPIA ADVENTURE ORGANIZED”; primary CTA: “GET THE FREE QUICK START PACK.”
- The email claim posts to `/api/pokopia/funnel/start`; successful responses must return `/pokopia/daily-reset`. Existing-access recovery posts to `/api/auth/magic-link` with the Quick Start return anchor. Neither behavior is in scope for change.
- Five approved preview assets are rendered through `ProductPreviewFan`: Dashboard, Mini Daily Reset, What Should I Work On Next, Quick Cloud Island Sketch, and Rare Finds Notes. `lib/quick-start/manifest.ts` verifies a seven-page Letter/A4 product, but pages six and seven have no approved preview images in `public/assets/products/pokopia/quick-start/`.
- `FunnelFrame` provides the focused header, existing-access anchor, footer disclaimer, journey continuity, and current canonical/legacy event calls.
- `ConsentBanner` is a fixed-position, non-modal `role=region` with explicit Reject and Allow actions. It is unchanged by this design phase.

## Rendered mobile baseline

Measurements were taken on the current local route at 844px viewport height after choosing Reject advertising; the initial undecided panel occupied y=76–416 at 320px and y=76–372 at 390px.

| Width | Email label | Input | CTA | Visible fraction | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 320px | y=907–926 | y=934–987 | y=997–1049 | 0% each | None |
| 390px | y=875–894 | y=902–955 | y=965–1017 | 0% each | None |

This is a verified layout observation, not a claim that the current page is inaccessible. It motivates the proposed mobile hierarchy: compact preview plus form within the first usable viewport after a consent choice.

## Current friction and proposed response

| Observed issue | Evidence | Proposed response | Approval needed |
| --- | --- | --- | --- |
| Email claim begins below the first 844px mobile viewport | Rendered measurements above | Put the compact real-page composition before but alongside a shorter hero, then show the form before the end of the initial usable viewport | Yes |
| Claim and recovery are both prominent early | Current component section order | Retain header recovery anchor; make recovery a secondary, clearly labeled later panel | Yes |
| Real preview appears after recovery | Current JSX order | Bring three approved preview pages into hero; retain a deeper five-page section | Yes |
| Seven-page claim has only five customer-visible preview assets | Asset inventory | State “seven pages”; show only the five approved pages and label the asset gap | Yes |

## Assumptions and non-goals

- Proposed visuals are static design artifacts, not deployed screenshots.
- Email-provider delivery timing is not verified; proposed copy does not promise immediate email delivery.
- No route, API, analytics, privacy, checkout, entitlement, or recovery behavior is changed.
