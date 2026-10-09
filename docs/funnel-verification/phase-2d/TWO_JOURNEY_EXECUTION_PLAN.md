# Two Journey Execution Plan

Status: PREPARED ONLY — no checkout, user, journey, order, webhook, download, analytics, or email action occurred.

## Synthetic identity and evidence convention

Use two separately approved synthetic test identities, one per journey, with a date/run-scoped alias held outside committed documentation. Store only redacted user, order, session, and event identifiers in the later report. Retain canonical staging payment/order records unless an approved staging-data retention procedure directs otherwise; never delete records to conceal test activity.

## Journey A — Complete Player System

1. Claim Free Quick Start through the normal staging route.
2. Select P06, then P16; server journey state must qualify P18.
3. Select P18 and reach the normal authenticated checkout review.
4. Capture the authorized review page and validate display items: Free Quick Start $0.00, P06 $4.99, P16 $19.99, P18 $24.99.
5. Require canonical paid total **4,997 cents / USD $49.97**.
6. Complete one authorized Stripe TEST payment, verify its signed webhook, one paid order, and four entitlements: Free Quick Start, P06, P16, P18.
7. Reconcile the four total sources. Verify owner downloads; then conduct approved denial and expiry checks. Replay the same signed webhook only through an approved method and confirm no duplicate order, entitlement, or purchase event.

## Journey B — Completionist downsell

1. Use the separate synthetic identity and claim Quick Start.
2. Select P06, then P16; reach qualified P18.
3. Skip P18, then verify P17 is available only through the qualified skip transition.
4. Select P17 and capture normal checkout review with Free Quick Start $0.00, P06 $4.99, P16 $19.99, P17 $14.99.
5. Require canonical paid total **3,497 cents / USD $34.97**.
6. Complete one authorized Stripe TEST payment, verify webhook, one paid order, and four entitlements: Free Quick Start, P06, P16, P17.
7. Verify P17 provides both Field Guides, README, and the approved final-v2 26-card PDF hash documented in `SUPABASE_STAGING_SECURITY_AUDIT.md`; then verify idempotent replay.

## Expected synthetic writes

| Resource | A | B | Total estimate |
| --- | ---: | ---: | ---: |
| Synthetic authenticated identities/sessions | 1 | 1 | 2 |
| Funnel journeys | 1 | 1 | 2 |
| Stripe Checkout Sessions / paid TEST transactions | 1 / 1 | 1 / 1 | 2 / 2 |
| Paid orders | 1 | 1 | 2 |
| Entitlements stored in paid orders | 4 | 4 | 8 |
| Provider webhook deliveries | 1 plus 1 replay | 1 plus 1 replay | 4 deliveries |
| Journey-event rows | about 8 | about 10 | about 18 |
| Authoritative analytics rows | at least 2 | at least 2 | at least 4 |

These are estimates; report actual redacted counts after any authorized run. Download generation changes fulfillment/access state and is included in the Supabase mutation scope.

## Stop conditions

Stop immediately for a target/mode mismatch, amount/currency mismatch, failed signature validation, duplicate durable record, unauthorized eligibility success, public storage response, unexpected 5xx, or missing entitlement/file. Do not repair by directly changing orders, entitlements, journeys, storage, or analytics rows.
