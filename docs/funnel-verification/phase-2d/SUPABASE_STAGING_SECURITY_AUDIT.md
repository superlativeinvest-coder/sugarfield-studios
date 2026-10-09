# Supabase Staging Security Audit

Status: PARTIAL — approved staging identity and local schema/implementation are verified; remote schema, RLS, objects, and auth settings are NOT VERIFIED.

## Verified local evidence

- `lib/supabase/environment.ts` recognizes only project ref `faxsnbdjzniwyhtnsvfz` as STAGING and fails closed for production or unknown refs.
- `scripts/supabase-staging-check.ts` proves matching staging URLs before any provider client is constructed.
- Additive migrations define accumulated journey fields, canonical line-item storage, and analytics event schema/uniqueness (`supabase/migrations/202609130001_add_pokopia_cumulative_checkout.sql`, `202609190001_add_pokopia_accumulated_order.sql`, and `202609280001_create_phase1_analytics.sql`).
- Analytics migration enables RLS and revokes browser-role access to `analytics_events`; service-role server code is the insert boundary.
- Paid download route requires authentication, paid order, matching owner customer ID, and matching entitlement before secure delivery (`app/api/orders/[order-id]/downloads/[product-id]/route.ts`).
- Quick Start download requires the opaque hashed access cookie and allows only `letter` or `a4` (`app/api/pokopia/quick-start/downloads/[file-id]/route.ts`).
- `lib/delivery/service.ts` creates one-hour signed URLs only after the applicable authorization route has passed. Calling either download route also changes fulfillment/access state, so it is a Stage B mutation.

## Storage and fulfillment evidence

- P16 V3 maps exactly 12 hash-locked PDF objects.
- P18 staged mapping contains exactly 22 PDFs across 11 Letter/A4 component pairs.
- P17 has four approved entries: US Letter Field Guide, A4 Field Guide, README, and 26-card reference collection. Its P04 hash is `FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB`.
- Committed storage verification reports exist for P16 V3 and P18, but they are historical evidence and do not substitute for Stage B synthetic-customer delivery verification.

## Missing information and blockers

No remote database, bucket, RLS policy, authentication setting, object listing, download, or signed URL was requested. Therefore actual private storage posture, deployed schema parity, and staging-data isolation remain unverified externally.

## Proposed mutations and authorization

Stage B will create/update synthetic journeys, order/entitlement records through the normal webhook path, analytics rows, and fulfillment status/access timestamps. It may generate synthetic-customer signed URLs. It must not upload, delete, promote, or alter storage objects/RLS/migrations.
