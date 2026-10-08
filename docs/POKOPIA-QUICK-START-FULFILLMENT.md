# Pokopia Quick Start Pack Fulfillment

## Integration status

The Quick Start customer PDFs are approved and privately uploaded. The application integration is implemented, but public access remains blocked until the additive Supabase migration is applied in the configured project.

Current status: `QUICK START PACK FULFILLMENT INTEGRATED — READY FOR PUBLIC FUNNEL USE`

## Product identity

- Product ID: `FREE-QUICK-START`
- SKU: `pokopia_quick_start_pack`
- Price: free
- Public route: `/pokopia/start`
- Stripe Product/Price: none

## Storage manifest

Bucket: `digital-products` (private)

| Customer file | Storage object | SHA-256 | Pages |
|---|---|---|---:|
| `Pokopia_Quick_Start_Pack_US_Letter.pdf` | `pokopia/quick-start/pokopia-quick-start-pack-us-letter.pdf` | `200036ED1EE32A2239C6796779119EB4BA500E6A0C181B0DE1884B22EBBE8909` | 7 |
| `Pokopia_Quick_Start_Pack_A4.pdf` | `pokopia/quick-start/pokopia-quick-start-pack-a4.pdf` | `B066D33E87ED0EC019812E750D3CDDA2E0F4F7E76C03AFFC182E4C60CA2CBA1B` | 7 |

Both objects were downloaded read-only from Storage after upload and matched the locked source hashes.

## Access model

Signup posts to the existing `/api/email-signup` route with the Quick Start product identity. The server upserts a dedicated `free_product_access` record, stores only a SHA-256 hash of an opaque access token, and sets an HttpOnly/Secure/SameSite cookie. The dedicated download route accepts only `letter` and `a4`, verifies the server-side record, and creates one-hour signed URLs.

The implementation does not use query flags, client state, paid orders, permanent public URLs, or arbitrary Storage paths as access truth.

MailerLite is supported through `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID`. Until both server-only values are set, Quick Start signup grants secure browser access after the durable access record succeeds without falsely claiming that an email was sent. When configured, MailerLite subscriber upsert succeeds before access is granted, so an email-provider failure is surfaced instead of creating a partial signup.

## Migration blocker

Prepared migration:

`supabase/migrations/202609050005_create_free_product_access.sql`

It creates the private `public.free_product_access` table, unique email/product records, hashed-token lookup, timestamps, attribution fields, and RLS. It has not been applied because no Supabase CLI, SQL execution connection, or migration runner is configured in this workspace.

Until that migration is applied and smoke-tested, `/api/email-signup` returns a controlled configuration error for Quick Start access and the product must not be promoted as publicly usable.

## Activation smoke-test results

- Invalid email submission: PASS — HTTP 400; no access row or cookie.
- Valid email submission: BLOCKED as expected — HTTP 503 because `public.free_product_access` is absent.
- Download without access cookie: PASS — HTTP 401.
- Storage object hash verification: PASS for Letter and A4.
- Service-role table verification: PASS — `public.free_product_access` and all required columns are reachable.
- Anonymous/direct table access: PASS — HTTP 401 without an API key.
- Valid signup: PASS — HTTP 200 and durable access record created.
- Duplicate signup: PASS — one access row retained; access refreshed without erasing attribution.
- Invalid signup: PASS — HTTP 400 and no access grant.
- Fake `?free=true` download: PASS — HTTP 401 without a valid cookie.
- Paid-product file request: PASS — rejected with HTTP 404.
- Letter download: PASS — HTTP 200 signed URL, approximately 60 minutes, approved hash match.
- A4 download: PASS — HTTP 200 signed URL, approximately 60 minutes, approved hash match.
- Cookie: PASS — `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and 30-day max age.
- Analytics and P06 CTA code paths: PASS; event names and `/pokopia/daily-reset` route verified.
- Paid-flow regression: PASS — 15/15 tests.

## Paid-flow boundary

Paid `public.orders`, Stripe configuration, existing paid download authorization, historical entitlements, P06/P13/P16/P17 behavior, and future P18/P19 work are unchanged.

## Activation checklist

1. Apply `202609050005_create_free_product_access.sql` to the configured Supabase project.
2. Submit a valid Quick Start signup and confirm one durable access row.
3. Repeat the same signup and confirm idempotent reuse.
4. Verify Letter and A4 signed downloads.
5. Verify missing access, fake query flags, wrong file IDs, paid product IDs, and expired credentials are rejected.
6. Update the asset-gap register to `ASSETS APPROVED / FULFILLMENT CONNECTED` only after those checks pass.
