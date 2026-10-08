# Staging Checkout Verification

Status: BLOCKED for new transactions; preflight PASS.

## Read-only preflight

Both commands passed without migrations, deploys, provider writes, or checkout creation:

- `npm run staging:check`
- `npm run supabase:staging:check`

Verified output: approved Supabase staging project `faxsnbdjzniwyhtnsvfz`, matching browser/server URLs, Stripe **TEST** key, webhook secret, required Price IDs, cumulative checkout and P18 activation flags, verified-storage marker, migration presence, and staging CLI linkage.

## Code integrity inspected

- The webhook rejects missing/invalid signatures (`app/api/stripe/webhook/route.ts:20-25`).
- Cumulative checkout compares the persisted fingerprint, canonical selected products, paid total, currency, and Stripe line items (`route.ts:47-53`).
- Fulfillment version selection fails closed when its environment is not approved (`route.ts:55-57, 78-82`).
- Order creation deduplicates on provider session ID (`lib/orders/idempotency.ts:3-7`), with repository handling duplicate-key races (`lib/orders/repository.ts:50-55`).
- Unit tests covering cumulative totals, P18 eligibility, P17 gating, webhook secret rotation, and idempotency passed in the 140/140 unit run.

## Blocked journeys

No new P06 + P16 + P18 or P06 + P16 + skip-P18 + P17 transaction was created. The request did not separately authorize synthetic checkout creation or Stripe test payment. Consequently there is no Phase 2C authenticated checkout screenshot, Stripe amount, signed webhook, durable order, entitlement, or replay evidence.

## Required next action

Authorize two synthetic staging journeys. For each, record a safe test identifier and reconcile server canonical total, Stripe Checkout amount, webhook amount, and persisted order amount. Stop on any mismatch. Then replay the signed event and verify exactly one paid order and entitlement set.

Rollback: a code revert is independent from retaining or cleaning synthetic staging data; do not delete payment/order records without an approved staging-data procedure.
