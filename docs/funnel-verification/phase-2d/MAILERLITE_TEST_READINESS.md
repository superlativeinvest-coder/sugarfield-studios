# MailerLite Test Readiness

Status: BLOCKED.

## Evidence inspected

- `.env.staging.local` has no `MAILERLITE_API_KEY` or `MAILERLITE_GROUP_ID`.
- `lib/email/provider.ts` requires both before creating a provider; its only delivery operation is a MailerLite subscriber upsert.
- `app/api/pokopia/funnel/start/route.ts` queues delivery only after normal access/journey persistence succeeds.
- Unit tests validate provider request handling with mocked requests; they are not provider-delivery evidence.

## Missing prerequisites

1. Approved isolated staging API credential.
2. Dedicated staging/test group that cannot affect real subscribers.
3. Authorized synthetic inbox.
4. Explicit authorization to create one synthetic subscriber and send the resulting provider delivery.

## Proposed future mutation

One synthetic address would be upserted into the approved test group by the normal Quick Start route, producing one journey delivery-status update and one provider attempt. Verify provider acceptance, persisted status, inbox receipt, and secured access without exposing the address or link.

## Authorization required

MailerLite testing is independent of Stripe testing and remains prohibited until all four prerequisites are confirmed in writing.
