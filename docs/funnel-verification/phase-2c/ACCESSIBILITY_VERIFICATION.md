# Accessibility Verification

Status: PARTIAL — automated semantics and keyboard checks pass; manual screen-reader testing is BLOCKED by this environment.

## Automated verification

- Consent controls use named buttons; both decisions are keyboard focusable and have a visible outline assertion (`tests/e2e/pokopia-phase-2a-2.spec.ts`).
- Form labels and single scoped alerts are exercised with keyboard submission (`pokopia-phase-2a-2.spec.ts`).
- Start has one claim form, a separate recovery landmark/anchor, semantic headings, image alt text, contrast checks, final-CTA focus behavior, and responsive hit tests (`tests/e2e/pokopia-phase-2b.spec.ts`).
- All associated tests passed in the 33/33 isolated Playwright run.

## Consent implementation

`components/privacy/ConsentBanner.tsx` renders a non-modal `aside`/`region`, labels it with `consent-title`, and presents explicit Reject and Allow controls. `lib/privacy/consent.ts` stores a versioned choice and fails closed when storage is unavailable. `lib/analytics/tiktok-pixel.ts:197-203` returns `consent_required` before advertising consent is granted.

## Manual screen-reader result

BLOCKED. The installed Windows accessibility helper returned `Trusted RPC service is not configured: sky`; no screen-reader application or controllable accessibility surface was available. No claim is made about NVDA, JAWS, VoiceOver, or TalkBack speech output.

## Required human checklist

1. NVDA + Firefox/Chrome: Start, consent reject/allow, invalid claim, recovery error, final CTA focus.
2. VoiceOver + Safari iOS: 320/390 layouts, consent panel and Privacy Choices, Start claim and recovery.
3. Confirm visible focus, landmark/heading announcements, one alert per failed form, and that focus returns to the original email input after final CTA.
4. Record browser, assistive technology version, route, result, and defect reproduction steps.

Rollback: none; Phase 2C adds no application accessibility change.
