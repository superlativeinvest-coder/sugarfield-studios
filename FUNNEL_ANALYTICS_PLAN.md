# Pokopia Funnel Analytics Plan

This documents existing instrumentation and a measurement blueprint. It does not add Clarity, PostHog, or any other integration.

## Current instrumentation

`FunnelFrame` emits legacy funnel events and canonical page views (`components/pokopia/PokopiaFunnelStage.tsx:14`). Canonical browser events use `trackFunnelEvent` and route-stable page-view IDs (`lib/analytics/transport.ts:18-67`). The client payload contract and protected fields are defined in `lib/analytics/contract.ts`.

Journey events are persisted by `recordPokopiaJourneyEvent` (`lib/pokopia-funnel/journey-repository.ts:54-57`) and include step, branch, attribution, and cents value. Server-authoritative order/purchase analytics are recorded from the Stripe webhook (`app/api/stripe/webhook/route.ts:61-64`, `:121-125`) through `lib/analytics/server.ts` and TikTok purchase dispatch.

The `analytics_events` migration provides event-ID uniqueness, indexed dimensions, private RLS, and one purchase event per order (`supabase/migrations/202609280001_create_phase1_analytics.sql:11-100`).

## Canonical funnel event contract

| Stage | Events to measure | Authority |
|---|---|---|
| Entry | `session_started`, `free_start_viewed` | Browser page view |
| Lead | `email_submitted`, `quick_start_claimed` | Browser + start API/journey |
| Offer views | `p06_viewed`, `p16_viewed`, `p18_viewed`, `p17_viewed` | Browser plus server gate |
| Decisions | `p06_buy_clicked`, `p06_skipped`, `p16_buy_clicked`, `p16_skipped`, `p18_buy_clicked`, `p18_skipped`, `p17_buy_clicked`, `p17_skipped` | Browser intent + journey transition |
| Eligibility | `p18_qualified`, `p18_not_qualified`, `p17_downsell_viewed` | Server journey |
| Checkout | `checkout_review_view`, `checkout_started`, `checkout_failed`, `checkout_returned` | Server session + browser navigation |
| Payment | `purchase_completed` | Stripe webhook/order only |
| Fulfillment | `download_authorized`, `download_denied`, `download_failed` | Download route/order repository |
| Journey | `funnel_completed`, `double_skip_bypassed` | Server journey |

Names above that are not already in the taxonomy are measurement recommendations, not existing events. Existing names must be checked in `lib/analytics/taxonomy.ts` before implementation.

## Identity and deduplication

Use these identifiers without exposing sensitive values:

- `anonymousId`: browser-level attribution identity.
- `sessionId`: funnel session from browser continuity.
- `journeyId`: server durable journey identifier.
- `orderId`: server order identifier.
- Stripe session/event IDs: server-only correlation fields.
- `eventId`: canonical deduplication key.

Client events must not submit protected revenue, order, or timestamp fields; the contract explicitly rejects protected keys (`lib/analytics/contract.ts`). Purchases must be generated from verified orders, not client callbacks. Replay should yield one purchase event because of the unique order index.

## Measurement definitions

Primary funnel measures:

1. Start view → valid email submission.
2. Email submission → P06 view.
3. P06 view → P06 acceptance and skip rate.
4. P16 view → P16 acceptance and skip rate.
5. Qualified P18 view → P18 acceptance, skip, or bypass.
6. Qualified P18 skip → P17 view and acceptance.
7. Checkout review → Stripe session creation.
8. Stripe session → verified paid order.
9. Paid order → first authorized download.

Guardrails:

- Duplicate order or purchase-event rate.
- Missing-entitlement rate.
- Unauthorized/public-storage response rate.
- Webhook signature failures and replay errors.
- 4xx/5xx by route.
- Checkout total/fingerprint mismatch rate.
- Journey transition conflict rate.
- Email delivery failure/not-configured rate.
- Core Web Vitals and JS errors on funnel pages.

No baseline, lift, or significance claim is made because repository data does not establish one.

## Behavioral diagnosis tools

Microsoft Clarity supports session recordings, heatmaps, and funnel/event analysis ([documentation](https://learn.microsoft.com/en-us/clarity/)). Use it only after consent/privacy review, mask email/payment/personal content, and segment by route and viewport. Clarity recording retention and heatmap limitations must be considered ([session recordings](https://learn.microsoft.com/en-us/clarity/session-recordings/session-list), [heatmaps](https://learn.microsoft.com/en-us/clarity/heatmaps/heatmaps-features)).

PostHog experiments use feature-flag exposure plus existing events ([experiments](https://posthog.com/docs/experiments)). If adopted later, assign variants before the page decision, record exposure, predefine one primary metric and guardrails, and exclude users with conflicting rollout assignments.

## Privacy and data quality

- Respect the existing advertising-consent path before advertising pixels or behavioral replay.
- Never send email, access tokens, signed URLs, full customer details, or payment secrets to client analytics.
- Validate event name, event ID, step, product, and money fields at the API boundary.
- Compare browser checkout events to Stripe/order truth in a server-side reconciliation report.
- Alert on events arriving out of order, impossible branch combinations, or purchases without verified orders.

## Validation procedure

Use fixture journeys and webhook replay tests for event ordering, deduplication, invalid signatures, stale sessions, and unauthorized downloads. Use rendered QA only to validate event firing on real CTA interactions; do not treat a client event as proof of a completed purchase.
