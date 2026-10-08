# Responsive Visual QA

Status: PASS for automated coverage and inspected local screenshots; no production URL was tested.

## Method and evidence

The stable Playwright suite hit-tested visible CTAs and asserted no horizontal overflow across **320, 360, 375, 390, 430, 768, 820, 1120, and 1440px**. P18 and P17 used their existing non-production `?preview=1` fixture only; eligibility logic was not weakened.

Locally rendered screenshots were inspected at:

- `_TEMP/phase-2c/start-1440-consent-decided.png`
- `_TEMP/phase-2c/start-390-consent-decided.png`
- `_TEMP/phase-2c/start-320-consent-decided.png`
- `_TEMP/phase-2c/p17-390-consent-decided.png`

These ignored local evidence files are not release artifacts. Captures with undecided consent were also inspected for Start at 320/390/1440 and P17 at 390.

## Verified results

| Area | Result |
| --- | --- |
| Start | At 320/390 post-decision, labelled email input and full CTA are visible within the first 844px viewport; no horizontal overflow. |
| P06, P16, P18, P17, sign-in, recover | Phase 2A.2 has CTA visibility, center-point hit-testing, keyboard focus, and overflow assertions at every required width. All passed in the isolated run. |
| Consent undecided | The fixed non-modal panel remains visually prominent, but Reject/Allow were visible, at least 40px in both directions, focusable, and operable. |
| Consent decided | Compact Privacy Choices control was visible and did not obscure the inspected Start or P17 CTA. |
| Product presentation | Inspected Start captures showed the approved P01–P05 artwork treatment; no clipped hero artwork was observed. |

## Sources and tests

- `components/privacy/ConsentBanner.tsx`
- `app/globals.css`
- `components/pokopia/PokopiaStarterStage.tsx`
- `tests/e2e/pokopia-phase-2a-2.spec.ts` — `all required routes remain operable at <width>px`
- `tests/e2e/pokopia-phase-2b.spec.ts` — `remains usable and complete at <width>px`

## Limitations

Screenshot comparison is visual inspection, not pixel-baseline approval. Browser automation cannot assess assistive-technology speech output. The fixed consent panel intentionally occupies early viewport space before a visitor decides; this is a documented consent constraint, not a passing claim that it is absent.

Next action: include the same viewport matrix on the approved staging hostname after staging authorization. Rollback: no runtime changes were made.
