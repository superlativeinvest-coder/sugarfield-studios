# Consent UX Fix Report

Status: PASS for the implemented UX repair; staging advertising delivery remains governed by existing configuration.

## Change

- `components/privacy/ConsentBanner.tsx` now renders the undecided prompt as a labelled non-modal `region`, not a modal dialog.
- Reject and Allow remain explicit `setAdvertisingConsent("denied"|"granted")` actions.
- `app/globals.css` keeps the panel out of document flow, places it below the header-safe area, limits pointer events to the panel, applies safe-area offsets, stacks actions on mobile, and constrains panel height with scrolling.
- Existing signed server consent persistence and TikTok gating were not changed.

## Evidence

Playwright measurement at 320/360/375/390/430px recorded zero CTA displacement after Reject/Allow compared with the undecided state. CTA top positions were 996.9/976.0/957.5/965.3/986.2px respectively; the CTA is below the initial 844px viewport in both states, so consent does not change its initial visibility. Overflow was 0px at every width.

Screenshots: `_TEMP/phase-2a-1/consent-start-320.png`, `consent-start-360.png`, `consent-start-375.png`, `consent-start-390.png`, and `consent-start-430.png`.

The required-route hit test passed with no actionable element intersecting the panel on Start, P06, P16, P18 preview, P17 preview, Sign-in, or Recover.

## Consent behavior

- Reject and Allow were both visible and keyboard/pointer addressable.
- Existing TikTok tests plus the new regression test confirm unknown and denied consent do not dispatch advertising events; granted consent initializes the pixel.
- No automatic acceptance or close-as-approval path was introduced.

## Rollback

Revert the Phase 2A.1 commit. Consent cookies and staging test evidence are separate from code rollback and are not deleted by a code revert.
