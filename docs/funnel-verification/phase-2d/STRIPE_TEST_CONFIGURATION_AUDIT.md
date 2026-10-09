# Stripe TEST Configuration Audit

Status: PARTIAL — local configuration proves TEST-mode intent and required Price ID presence; remote Stripe account objects and webhook delivery are NOT VERIFIED.

## Verified configuration

- `.env.staging.local` classifies `STRIPE_SECRET_KEY` as **TEST** without revealing it.
- `STRIPE_DAILY_RESET_PRICE_ID`, `STRIPE_ADVENTURE_COMPANION_PRICE_ID`, `STRIPE_P17_STANDALONE_PRICE_ID`, and `STRIPE_P18_COMPLETE_PLAYER_SYSTEM_PRICE_ID` are present and formatted as Stripe Price IDs.
- `STRIPE_WEBHOOK_SECRET` is present.
- `lib/stripe/configuration.ts` selects test prices outside live mode and reserves P18 live price selection for a live key.
- `app/api/pokopia/funnel/checkout/route.ts` creates `mode: "payment"` sessions from server-side canonical selections only; client values do not supply prices or totals.
- `app/api/stripe/webhook/route.ts` validates Stripe signatures, validates amount/currency/line items against canonical selected products, verifies the server journey fingerprint, and uses `createOrderIdempotently`.
- `lib/stripe/webhook-signature.ts` accepts only a signature constructed with an approved configured secret; `tests/webhook-secrets.test.ts` covers rotated-secret acceptance and invalid rejection.

## Future reconciliation contract

For every authorized test payment, require equality in USD between the canonical server cart cents, Stripe Checkout Session `amount_total`, validated webhook `amount_total`, and persisted `orders.amount_total`. Any mismatch is a FAIL and stops remaining purchases.

## Missing information and blockers

- TEST account identity, Price currency/unit amount, and dashboard webhook endpoint are not queried in Stage A.
- No Checkout Session, customer, PaymentIntent, event, refund, or webhook was created.
- A later Stage B run requires explicit authorization for exactly two TEST Checkout Sessions and payments, two provider webhook deliveries, and one replay delivery per completed journey.

## Authorization required

Authorize named Stripe TEST-mode checkout creation and payment completion only after the staging deployment, endpoint, account ownership, and synthetic identity are reconfirmed.
