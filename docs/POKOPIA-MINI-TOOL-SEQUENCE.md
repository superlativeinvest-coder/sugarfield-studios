# Pokopia Mini Tool Sequence 2

## Current boundary

Sequence 2 is the qualified-buyer branch after the Daily Reset offer:

`verified P06 Daily Reset order → /pokopia/funnel/mini-tool`

The route does not automatically continue to the Companion or Completionist Kit. Those remain future sequences.

## Qualification

The Mini Tool page accepts an `order_id` or `funnel_session` context, then checks Supabase through `qualifiesForDailyResetUpgrade`. A visitor qualifies only when the server finds a paid P06 order with a matching P06 entitlement. Browser storage, query parameters alone, and client purchase flags are not purchase truth.

## Offer state

The Mini Tool is the approved P13 Pokopia Event Tracker: `$3.99 USD`, SKU `P13`, entitlement `P13`, lookup key `pokopia_mini_tool_v1`, and offer ID `pokopia_mini_tool`. Its approved preview is served from the public product-image pipeline, while the approved A4 and US Letter PDFs are stored privately in Supabase Storage.

`STRIPE_MINI_TOOL_PRICE_ID` must point to the active test/live Price before the CTA is enabled. Local setup uses `npm run stripe:configure-mini-tool` and rejects live Stripe secret keys.

## Reused commerce data

Checkout reuses `/api/checkout` and carries product ID, SKU, offer ID, `upgrade=true`, `funnel_step=mini_tool`, source P06 order ID, funnel session, and first/current attribution. The API verifies the qualifying P06 order again before creating Stripe Checkout. The existing verified webhook stores the P13 order and grants the P13 entitlement idempotently.

The verified webhook also persists `source_order_id` on the P13 order. Migration `202608290004_add_source_order_id.sql` is additive and leaves historical orders unchanged.

The secure download endpoint requires a paid P13 order, a matching P13 entitlement, and one of the two configured P13 files. P06 or unrelated entitlements cannot retrieve P13 files.

## Production verification status

- P13 catalog, artwork, private fulfillment files, delivery map, test Price, checkout gate, qualification, attribution, entitlement, and secure delivery are implemented.
- Existing migrations `202608290003_stripe_order_identifiers.sql` and `202608290004_add_source_order_id.sql` were verified as applied.
- The Stripe test-mode purchase, webhook, Supabase order, entitlement, and signed downloads have been verified. The unrelated paid-product case remains a documented test limitation only.

## End-to-End Stripe Test Verification

Verification completed on 2026-08-29 in Stripe test mode. No secrets or payment details are included.

- Source P06 order ID: `b9186160-8a98-4729-a7f7-e4284881c410`
- P13 Supabase order ID: `683531a3-9168-4a49-8211-70a824a1054a`
- Checkout Session ID: `cs_test_a1Zb23iCXpaWAEC0bhuzUgOuPJvMiJ1DG6tXIR1l5t6isCaidVPVtgqfck`
- Payment Intent ID: `pi_3U9xvFFsZqGu70Gu0TRElqEW`
- Stripe event ID: `evt_1U9xvIFsZqGu70Gu9nmY6ItH`
- Supabase order: `paid`, P13/SKU P13, `$3.99 USD`, `pokopia_mini_tool`, `upgrade=true`, `funnel_step=mini_tool`, and `fulfillment_status=fulfilled`
- Source order persistence: `source_order_id` matches the verified P06 order
- Entitlements: exactly one P13 entitlement was granted; the original P06 entitlement remains intact
- Signed downloads: both `pokopia-event-tracker-a4.pdf` and `pokopia-event-tracker-letter.pdf` succeeded through private signed URLs
- Negative access: P06-only access returned 403, invalid P13 file returned 403, and direct public PDF access returned 404. An unrelated live/test paid-product download attempt could not be performed because no legitimate unrelated paid product is currently active/configured. This condition is covered deterministically by automated entitlement/product mismatch tests, and live entitlement enforcement was additionally confirmed using a paid P06-only buyer, which received HTTP 403 when requesting P13 files. The unrelated paid-order case is not represented as executed.
- Attribution: first-touch, current-touch, funnel ID, and funnel session matched the Checkout Session metadata
- Duplicate webhook: replay returned 200 with the same order ID; Supabase retained one matching order and one P13 entitlement
- Confirmation: the page displayed “Pokopia Event Tracker” and did not start Sequence 3
- Automated verification: 6 tests passed; typecheck, targeted lint, catalog validation, and production build passed
