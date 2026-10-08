# Pokopia Checkout and Delivery Verification

Audit date: 2026-10-08. Read-only verification against local staging configuration and staging storage. No live charge, production email, production database mutation, or production customer access change was performed.

## Scope and evidence boundary

This report separates static/unit evidence, staging object evidence, and end-to-end gaps. Passing tests do not prove that a live customer completed payment, webhook delivery, entitlement creation, and authenticated download in one real transaction.

## Environment verification

`npm run staging:check` passed with:

- Approved staging Supabase project selected for both server and browser URLs.
- Stripe secret classified as TEST, not LIVE.
- Webhook secret present.
- P06, P16, P17, and P18 test Price IDs present.
- `POKOPIA_CUMULATIVE_CHECKOUT_ENABLED` present/enabled for staging.
- `P18_CHECKOUT_ACTIVATION_ENABLED` present/enabled for staging.
- Approved accumulated-order migration present.
- Supabase CLI linkage points to the approved staging project.

Secret values were not copied into this report.

## Checkout implementation evidence

The cumulative checkout route is `app/api/pokopia/funnel/checkout/route.ts:11-66`:

1. Rejects disabled environments, completed journeys, and empty paid selections.
2. Recomputes canonical line items and server prices.
3. Checks P16/P17/P18 readiness before session creation.
4. Requires an authenticated customer and matching journey ownership.
5. Creates/reuses Stripe Checkout using a SHA-256 cart fingerprint.
6. Sends server-derived metadata and allowlisted return/cancel origins.

The checkout page itself correctly redirects to recovery when no unpaid server journey exists (`app/pokopia/checkout/page.tsx:6-15`). During visual verification, `/pokopia/checkout` returned 307 to `/pokopia/recover?reason=checkout-unavailable` because no authorized unpaid staging fixture was created. The actual checkout review surface remains **NOT VERIFIED end-to-end** in this pass.

## Stripe signature and replay/idempotency coverage

Targeted tests: **29 passed**, including:

- `tests/webhook-secrets.test.ts`: accepts configured secret rotation, rejects invalid signatures.
- `tests/analytics-transport.test.ts`: stable authoritative order event IDs and webhook retry deduplication.
- `tests/pokopia-cumulative.test.ts`: canonical selection order, server totals, fingerprint stability, repeated BUY idempotence.
- `tests/pokopia-p18-eligibility.test.ts`: current P06/P16 qualification, historical verified P06 ownership, double-skip precedence, client-only field rejection.
- `tests/quick-start-fulfillment.test.ts`: Quick Start identity, two-file map, allowlist, hashed access token, signed URL expectation.
- `tests/p16-v3-staged-fulfillment.test.ts` and `tests/p18-staged-fulfillment.test.ts`: hash-locked manifests and fail-closed mismatch behavior.
- `tests/checkout-origin.test.ts`: public/restricted origin allowlisting.

Webhook implementation evidence:

- Signature verification: `app/api/stripe/webhook/route.ts:20-25` and `lib/stripe/webhook-signature.ts:1-12`.
- Accumulated checkout metadata, line-item, total, journey, and fulfillment-version validation: `app/api/stripe/webhook/route.ts:36-64`.
- Standalone price and fulfillment checks: `app/api/stripe/webhook/route.ts:78-125`.
- Provider-session idempotency: `lib/orders/idempotency.ts:3-5`.
- Database unique provider session/event constraints: `supabase/migrations/202608290001_create_orders.sql:1-24` and `202608290003_stripe_order_identifiers.sql:1-9`.

These are strong static/unit safeguards. They do not prove that Stripe test webhooks were delivered to the local server or that a complete staging order was created by an actual Checkout session.

## Order and entitlement evidence

The webhook creates paid orders idempotently and stores entitlements with product IDs, Stripe Price IDs, and versioned fulfillment mappings (`app/api/stripe/webhook/route.ts:55-64`, `:83-125`). Server-side readiness selectors choose staged or production mappings using `lib/delivery/fulfillment-environment.ts` and `lib/delivery/service.ts:53-95`.

Verified by unit/static tests:

- Canonical total is recomputed from server prices.
- Selected products are deduplicated and ordered.
- P18/P17 cannot be selected from an invalid branch.
- Webhook replay reuses one provider session/order identity.
- Purchase analytics does not mutate entitlements or fulfillment.

Not verified in this pass:

- A real Stripe test Checkout session reaching the local webhook.
- A staging `orders` row created from that session.
- A staging customer account receiving the exact expected multi-product entitlement set.

## Staging private-storage audit

The read-only `scripts/audit-pdf-delivery-staging.ts` completed against the approved staging project and private `digital-products` bucket.

| Result | Count |
|---|---:|
| Manifest inventory | 43 |
| Objects found | 43 |
| Authorized service-side downloads | 43 |
| Valid PDFs | 43 |
| Failures | 0 |

The audit checked object retrieval, PDF signature/EOF, parser validity, page count/size, and manifest byte sizes for versioned P16/P18 objects and Quick Start/P06/P17 files. It wrote only a local report under `_TEMP/pda/2026-10-08T13-49-00-046Z/report.json`; no storage object was uploaded, replaced, deleted, or made public.

A no-credential public-object request returned HTTP 400 for a Quick Start object. This is evidence against unauthenticated public retrieval in this request context, but it is not a substitute for testing the application download route with an authenticated customer and a non-owner.

## Authenticated download protection

The application route is `app/api/orders/[order-id]/downloads/[product-id]/route.ts:5-27`:

1. Requires an authenticated customer session.
2. Requires a paid order.
3. Requires customer ID ownership match.
4. Requires an entitlement for the requested product.
5. Creates one-hour signed URLs through the private-storage delivery provider.
6. Marks fulfillment status based on signed-download preparation.

Static route logic and unit coverage support the invariant. A staging end-to-end authorized download still needs a real paid test order and authenticated customer session.

## Email delivery verification

The start route queues email-provider subscription after durable Quick Start access is recorded (`app/api/pokopia/funnel/start/route.ts:42-57`). The provider implementation is MailerLite (`lib/email/provider.ts:1-35`) and unit tests pass:

- `tests/mailerlite-provider.test.ts`: subscriber upsert request shape.
- Provider failure test: non-2xx response fails rather than falsely claiming delivery.

The staging environment file does not contain `MAILERLITE_API_KEY` or `MAILERLITE_GROUP_ID`. Therefore:

- Provider integration logic: **verified by unit tests**.
- Staging email delivery configuration: **NOT VERIFIED / BLOCKED**.
- Actual email receipt: **NOT VERIFIED**.

The route is designed to record `not_configured` rather than falsely report an email sent when the provider is unavailable.

## Remaining staging end-to-end checks

Before treating checkout/delivery as staging-verified, execute two controlled test-mode branches without changing production:

1. **P06 + P16 + P18:** create an authorized staging journey through the normal UI, create Stripe test Checkout, complete the test payment, deliver a signed webhook, verify exactly one order, canonical total, P06/P16/P18 plus Quick Start entitlements, and authenticated signed downloads for every entitled product. Replay the webhook and confirm no duplicate order/entitlement/purchase event.
2. **P06 + P16, skip P18, buy P17:** follow the normal gated journey, complete Stripe test payment, verify P17 entitlement, both Field Guides, README, and the 26-page P04 PDF, then verify owner/non-owner download authorization.

Also required:

- Configure MailerLite staging credentials in a non-production environment and verify receipt using a synthetic address, without recording that address in reports.
- Validate signed URL expiry and private/public access behavior through the application route.
- Capture the actual checkout review page using an authorized unpaid staging fixture.
- Confirm no unexpected 5xx, duplicate rows, missing entitlements, public-storage responses, or authorization failures.

## Final readiness assessment

**Checkout and delivery are not fully end-to-end verified.**

The static safeguards, targeted tests, staging environment classification, and 43/43 staging PDF object audit are strong. The remaining blockers are the absence of a completed staging Stripe test purchase/webhook/download cycle, missing staging MailerLite configuration, and the inability to capture the real checkout page without an authorized unpaid journey fixture.

No production systems were changed.
