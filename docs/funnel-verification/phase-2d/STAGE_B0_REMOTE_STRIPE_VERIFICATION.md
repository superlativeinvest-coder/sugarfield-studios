# Phase 2D Stage B0 — Remote Stripe Read-Only Verification

Date: 2026-10-09
Scope: remote Stripe **read-only** verification using `.env.staging.local` only.
Result: **BLOCKED — staging webhook endpoint is absent. Do not begin Stage B1.**

## Safety gate and method

- The working tree was already dirty before this work. Pre-existing changes remain limited to `docs/PRODUCTION-RELEASE-READINESS.md`, `scripts/verify-release-schema.ts`, `tsconfig.json`, and the untracked P16 storage-verification report; none are part of this report or its commit.
- Stage A commit `126c6e52c9c9a30f14b731b6faedf0c83f04891b` was reviewed first. Its configuration audit left remote Price and webhook verification open; its safety gate prohibits Stage B mutations without further approval.
- The reader parsed `.env.staging.local` directly and did not load Next.js configuration or `.env.local`; inherited provider variables were deliberately ignored. Local checks required an `sk_test_` credential, four syntactically valid configured Price IDs, and the approved non-production HTTPS site host before constructing a Stripe client.
- The only Stripe API operations were `accounts.retrieve(null)`, four `prices.retrieve(id, { expand: ["product"] })` calls, and `webhookEndpoints.list({ limit: 100 })`. No create, update, delete, payment, customer, Checkout Session, event, database, email, or storage operation occurred.
- The first remote call returned the approved account ID `acct_1U97JVFsZqGu70Gu`. A Stripe Account response has no `livemode` field, so TEST mode is established by the explicit `sk_test_` credential and independently corroborated by each retrieved Price reporting `livemode: false`.

## Remote account and Price results

| Item | Expected canonical amount | Remote result | Classification |
| --- | ---: | --- | --- |
| Account | Approved TEST account | Exact account ID match; explicit staging credential has TEST prefix | PASS |
| P06 Daily Reset | 499 cents USD | Active, TEST (`livemode: false`), USD, one-time, per-unit; active Product `Pokopia Daily Reset Checklist` | PASS |
| P16 Adventure Companion | 1,999 cents USD | Active, TEST, USD, one-time, per-unit; active Product `Pokopia Adventure Companion` | PASS |
| P17 Completionist Kit | 1,499 cents USD | Active, TEST, USD, one-time, per-unit; active Product `Pokopia Completionist Kit` | PASS |
| P18 Complete Player System | 2,499 cents USD | Active, TEST, USD, one-time, per-unit; active Product `Pokopia Complete Player System` | PASS |

Price identifiers are intentionally omitted; the report retains only product-level evidence and values. The canonical server mapping is defined in `lib/pokopia-funnel/cumulative.ts:19-35`; it uses USD minor units 499, 1,999, 2,499, and 1,499, respectively. The verified remote values match that mapping.

## Webhook endpoint result

The approved staging host is `https://sugarfield-studios-gbrb1b0j1-superlativeinvest-2944s-projects.vercel.app`. Stripe returned four TEST webhook endpoints, but **none** had this required URL:

`https://sugarfield-studios-gbrb1b0j1-superlativeinvest-2944s-projects.vercel.app/api/stripe/webhook`

Therefore endpoint status and enabled-event configuration for this staging deployment cannot be verified, and normal Stripe TEST payment completion could not reach the configured receiver. The required `checkout.session.completed` event is the only event with durable order/fulfillment behavior in `app/api/stripe/webhook/route.ts:15-65`; events of other types return an acknowledgement at line 29. The route requires a signature (lines 20-26), validates the accumulated cart total and line items (lines 45-56), and creates orders idempotently (line 59). Signature rotation remains fail-closed in `lib/stripe/webhook-signature.ts:5-10`.

**This Stage B0 authorization does not permit creating or changing the missing endpoint.** A Stripe Dashboard administrator must provision or identify the existing TEST endpoint for the exact staging URL, enable `checkout.session.completed`, and place its corresponding secret in the approved staging deployment configuration. Re-run this read-only B0 verification after that work; do not disclose the secret in the result.

## Static security review

- `app/api/pokopia/funnel/checkout/route.ts:11-30` requires enabled cumulative checkout, a non-completed journey with paid selections, readiness checks, an authenticated journey owner, and an allowed checkout origin before any Checkout creation.
- The route forms its line items and total from server-side canonical selections (`app/api/pokopia/funnel/checkout/route.ts:15-27`) and binds the session to a checkout fingerprint and server journey (`lines 49-66`). No client-supplied total or Price ID is accepted.
- `app/api/stripe/webhook/route.ts:20-65` verifies the signed event, payment status, server journey fingerprint, canonical total, USD currency, and remote Stripe line items before fulfillment. `createOrderIdempotently` receives the Stripe session and event identifiers.
- `lib/stripe/configuration.ts:1-18,30-45` distinguishes TEST and live keys, selects the canonical TEST P18 Price outside live mode, and keeps webhook secrets server-only. `lib/stripe/server.ts:5-17` rejects a live key in non-production local execution.

These are source-level observations, not a substitute for a completed checkout, signed webhook delivery, persistence, authorization, or fulfillment test.

## Classification and required next action

| Gate | Result |
| --- | --- |
| Approved Stripe account identity | PASS |
| Explicit staging credential mode | PASS — TEST prefix and TEST Price objects |
| P06/P16/P17/P18 remote Price mapping | PASS |
| Staging webhook endpoint exists at exact URL | **FAIL** |
| Stage B1 transactions | **BLOCKED** |

No checkout, payment, webhook event, customer, subscriber, database record, signed URL, or provider object was created or changed. Stage B1 remains prohibited until the missing TEST webhook endpoint is independently corrected and a fresh B0 read confirms it is enabled for `checkout.session.completed`; it also still requires the separate explicit Stage B mutation authorization defined by `docs/funnel-verification/phase-2d/PHASE_2D_SAFETY_GATE.md:21-31`.

## Rollback

No provider or runtime state changed. Rollback consists solely of reverting the documentation commit, if desired; it does not require Stripe, Supabase, storage, or customer-data cleanup.
