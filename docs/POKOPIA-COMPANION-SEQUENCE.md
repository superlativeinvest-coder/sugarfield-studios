# Pokopia Funnel — Sequence 3: Companion Offer

Status: Sequence 3 verified in Stripe test mode. Sequence 4 is not started.

## Product ladder definition

`P06 Daily Reset → P13 Event Tracker → P16 Pokopia Adventure Companion → Completionist Kit`

P16 is the approved curated bundle of P14 Cloud Islands Planner and P15 Pokopia Spawn Tracker Guide, with US Letter and A4 PDFs for both products. P14 and P15 remain standalone products. P16 does not add collector cards, a full field guide, cooking references, habitat master checklists, paint references, bookmarks, or other completion assets.

The future Completionist Kit remains the highest-depth utility offer. Its recommended boundary is collection, habitats, recipes, reference, checklist/progress systems, and deeper planning. Candidate components are P04/P05 collection and field-guide materials, P07 cooking, P09 habitats, P10 paint reference, and selected completion-oriented references. P01–P03 are possible field-guide inputs; P08, P11, and P12 are excluded from the core completion promise unless separately approved. No Completionist product has been implemented.

## Canonical P16 configuration

- Product ID: `P16`
- SKU: `P16`
- Entitlement ID: `P16`
- Offer ID: `pokopia_companion`
- Name: Pokopia Adventure Companion
- Price: `$7.99 USD`
- Stripe lookup key: `pokopia_companion_v1`
- Stripe environment variable: `STRIPE_COMPANION_PRICE_ID`
- Funnel step: `companion`
- Qualification: paid P13 order with matching P13 entitlement, verified server-side through Supabase

## Assets and fulfillment

The public preview is `/assets/products/pokopia/companion/p16-adventure-companion.png` and uses only approved P14/P15 visuals. Private delivery files are:

- `pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf`
- `pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf`
- `pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf`
- `pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf`

The underlying P14/P15 exports are reused unchanged. They are uploaded to the private `digital-products` Supabase bucket.

## Checkout and lineage

The existing `/api/checkout` route is used. P16 checkout requires the canonical P16/SKU/offer/upgrade/funnel-step contract and a verified P13 source order. Metadata preserves funnel session, first/current attribution, and source order.

Required lineage: `P06 → P13 (source_order_id = P06) → P16 (source_order_id = P13)`.

The existing webhook grants P16 idempotently, stores Stripe identifiers and order metadata, and does not remove P06 or P13 entitlements. Secure delivery requires a paid P16 order, matching P16 product, matching P16 entitlement, and one of the four mapped files.

## End-to-end Stripe test verification

Verification date: 2026-08-29/30, Stripe test mode, local Next.js server, Supabase production project with private Storage.

- Source P13 order: `683531a3-9168-4a49-8211-70a824a1054a` (qualified from the existing P06 → P13 lineage).
- P16 Checkout Session: `cs_test_a19wHvjQKYP6AKFUNrR9Ke8HWn46x4wnIQOM9RaPCKtlgPzPK74eQ8pAkf`.
- P16 Supabase order: `df08b2ec-4ebd-40eb-ab4c-aee1022363eb`.
- Payment Intent: `pi_3U9zbOFsZqGu70Gu1KKt1VNh`.
- Stripe event: `evt_1U9zbQFsZqGu70GuE1gI4cFx` (`checkout.session.completed`, test mode).
- Stripe Price: `price_1U9zTdFsZqGu70GuzbPUj7qP` (`$7.99 USD`, lookup key `pokopia_companion_v1`).
- Order verification: P16, SKU P16, `pokopia_companion`, `upgrade=true`, `funnel_step=companion`, `$7.99 USD`, and `status=paid` matched Stripe.
- Lineage and attribution: `source_order_id` persisted as the verified P13 order; funnel session, first-touch attribution, and current-touch attribution persisted unchanged.
- Entitlements: exactly one P16 entitlement was present after webhook delivery and replay; the source P13 entitlement and its P06 lineage remain intact.
- Fulfillment: all four approved files were uploaded privately and signed downloads succeeded; the P16 order was marked fulfilled.
- Downloads: P14 A4, P14 Letter, P15 A4, and P15 Letter each returned an expiring Supabase signed URL.
- Negative access: P13-only and P06-only orders returned HTTP 403 for P16; invalid product/file requests returned HTTP 403; direct public PDF access returned HTTP 404. The secure endpoint requires a paid order, matching product, matching entitlement, and an allowed mapped file.
- Webhook idempotency: replaying the same signed event returned the same order ID and did not duplicate the P16 order or entitlement.
- Confirmation: the verified P16 confirmation displays “Pokopia Adventure Companion” and does not begin Sequence 4.

Automated verification: 10 tests passing. Typecheck passed. Targeted lint passed. Catalog validation passed with only existing P01–P03 artwork warnings. Production build passed. Migration `202608290004_add_source_order_id.sql` is applied.

No live charges were used. No unrelated paid-product fixture was manufactured; deterministic automated product/entitlement mismatch tests cover that limitation.

Sequence 4 remains deferred.
