# Signup, Recovery, and Analytics QA

Status: PARTIAL — rendered mocked flow coverage passes; real isolated provider delivery was not authorized.

## Verified rendered behavior

- `PokopiaStarterStage` keeps claim errors in `status` and recovery errors in `authStatus` (`components/pokopia/PokopiaStarterStage.tsx:30-35, 79-127`).
- Claim submit calls `/api/pokopia/funnel/start`; successful claims require the server-owned `/pokopia/daily-reset` route (`PokopiaStarterStage.tsx:84-93`).
- Recovery calls `/api/auth/magic-link` and retains its own live alert (`PokopiaStarterStage.tsx:123-128`).
- The claim form exposes one scoped `role="alert"`; recovery exposes a separate alert (`PokopiaStarterStage.tsx:156` and the anchored recovery section).
- Browser tests passed for invalid email, synthetic claim failure, success transition, recovery separation, keyboard submission, and header-anchor focus.

## Analytics mapping inspected

- Start view and funnel-step page events originate in `components/pokopia/PokopiaFunnelStage.tsx`.
- Claim success records canonical `email_submitted` and `quick_start_claimed` only after a successful response (`PokopiaStarterStage.tsx:88-89`).
- Browser events use `app/api/analytics/events/route.ts`, which validates client payloads, derives attribution/device fields server-side, and deduplicates persistence through `insertAnalyticsEventRow`.
- Unit test `authoritative order analytics remains one checkout and one purchase across webhook retries` passed in the 140-test suite.

## Evidence

`tests/e2e/pokopia-phase-2a-2.spec.ts`:

- `signup failure has one scoped alert and keyboard submission works`
- `existing-access failure has one scoped alert and never leaks to signup`

`tests/e2e/pokopia-phase-2b.spec.ts`:

- `uses the existing claim endpoint and retains scoped claim errors`
- `preserves the successful mocked claim transition`
- `existing-access header link keeps the recovery panel keyboard reachable`

All ran in the 33/33 isolated suite.

## Not verified

No actual lead, MailerLite subscriber, magic-link email, or staging analytics row was created in Phase 2C. The browser suite deliberately blocks persistence through unreachable local provider values. Therefore provider delivery, persisted-row attribution, and staging analytics dashboards are **NOT VERIFIED**.

Next action: use an authorized isolated staging group/inbox and synthetic identifier. Rollback: code rollback is a Git revert; any future staging records require a separate retention/cleanup procedure.
