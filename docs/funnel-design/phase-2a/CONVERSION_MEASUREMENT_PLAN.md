# Conversion Measurement Plan

## Existing events to preserve

| Measurement need | Existing signal |
| --- | --- |
| Landing exposure | `free_start_viewed`, `session_started`, and `pokopia_quick_start_viewed` |
| Form engagement | `pokopia_quick_start_signup_started` |
| Successful claim | `email_submitted`, `quick_start_claimed`, and `pokopia_quick_start_signup_completed` |
| Claim error | Existing scoped form alert and failed API response; no new event proposed |
| Existing access | Existing access endpoint/magic-link response and `quick_start_claimed` when access is restored |
| Downstream interest | `pokopia_quick_start_daily_reset_clicked` |
| Device/source | Existing page path and stored attribution fields |

## Later test hypotheses

| Hypothesis | Primary metric | Guardrail | Validation |
| --- | --- | --- | --- |
| Earlier form visibility improves qualified claims | Claimed Quick Starts per eligible Start view | Error rate; recovery completion | Controlled variant with unchanged API/event semantics |
| Real hero preview improves form engagement | Signup-started per Start view | Page performance; scroll depth if already available | Controlled variant |
| Secondary recovery reduces first-time distraction | Claim completion | Existing-access recovery success | Controlled variant |

No conversion rate, revenue lift, or statistical result is asserted here.

## Segmentation and integrity

- Segment by mobile/desktop viewport category and available first/current-touch source attribution.
- Use canonical event identity and deduplication rules already in the analytics contract.
- Do not add Clarity, PostHog, a Pixel behavior change, or an additional browser tracker.
- Review error rate, recovery behavior, and page performance before interpreting signup changes as an improvement.

## Approval requirement

Approve an experiment definition and stopping criteria before a customer-facing variant is released.
