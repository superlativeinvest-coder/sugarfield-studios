# Pokopia Funnel Implementation

## Route

Sequence 1 is implemented as a separate focused funnel:

`/pokopia/funnel/start` → verified email-provider success → `/pokopia/funnel/daily-reset`

The starter route captures only an email and stores minimal funnel continuity in session storage. The Daily Reset route presents the configured `$4.99` offer. A verified paid P06 order can continue to Sequence 2 at `/pokopia/funnel/mini-tool`, which presents the approved P13 Pokopia Event Tracker for `$3.99`. A verified paid P13 buyer can continue to the Sequence 3 P16 Companion offer at `/pokopia/funnel/companion`; P16 contains the approved P14 and P15 PDFs and is priced at `$7.99`. Sequence 4 remains deferred.

The public hub remains available at `/pokopia`. The server route loads the published Pokopia collection from `lib/catalog/data.ts` and passes those records to the client funnel. Product facts are not duplicated in the page. The focused sequence uses `data/pokopia-funnel.ts` for offer configuration and does not alter the hub component.

## Structure

`components/pokopia/PokopiaFunnel.tsx` contains the reusable reference implementation for the hero, goal router, problem cards, before/after comparison, starter-kit prompt, two-question assessment, system recommendations, bundle state, curated products, how-it-works, lifestyle section, lead capture, and final CTA.

The goal router supports `build`, `track`, `reference`, and `collect`. A valid `goal` query parameter preselects a goal without forcing an initial scroll. The selected goal is stored in session storage and highlights the matching recommendation panel.

The assessment is a product-fit router, not a personality quiz. Two answers map to builder, tracker, reference, collector, or completion paths and highlight the available catalog products. Visitors can browse without submitting email.

## Product and commerce truth

The published Pokopia records include the existing products plus P06 Daily Reset, P13 Pokopia Event Tracker, and P16 Pokopia Adventure Companion. P13 uses SKU/product ID `P13`, offer ID `pokopia_mini_tool`, and entitlement `P13`; P16 uses SKU/product ID `P16`, offer ID `pokopia_companion`, and entitlement `P16`. Their Stripe mappings are read from `STRIPE_MINI_TOOL_PRICE_ID` and `STRIPE_COMPANION_PRICE_ID` respectively.

The page uses existing product detail routes and the existing Stripe checkout boundary when records become active. It does not add a cart, payment provider, or client-side price source.

## Email, attribution, analytics

Lead capture reuses `POST /api/email-signup` through the existing `EmailSignup` component. The current provider boundary returns an explicit unavailable state; the UI never claims a successful subscription when no provider is configured.

Existing attribution capture remains mounted globally. Pokopia events extend the typed local analytics vocabulary in `lib/analytics/events.ts`; event payloads include the funnel ID, version, page path, and goal where relevant.

Sequence 1 adds `pokopia_funnel_started`, `pokopia_lead_captured`, `pokopia_daily_reset_viewed`, `pokopia_daily_reset_checkout_started`, and `pokopia_daily_reset_skipped`. Sequence 2 records the Mini Tool view, checkout start, and skip events. Email API success is the only condition that advances the starter route; the current provider boundary returns an explicit unavailable state.

## Launch dependencies

- Create and approve the Session Starter PDF and preview; see `docs/POKOPIA-SESSION-STARTER-ASSET-NEEDS.md`.
- Add the Daily Reset product to the catalog with approved contents, artwork, delivery metadata, and an active Stripe Price ID.
- Connect the existing email provider and delivery/fulfillment persistence before treating the sequence as production-ready.
- Complete one Stripe test-mode P06 → P13 purchase and verify the webhook, Supabase order, P13 entitlement, and signed downloads.

## Stripe connection

The Daily Reset catalog record reads `STRIPE_DAILY_RESET_PRICE_ID` on the server. With `STRIPE_SECRET_KEY` set, run `npm run stripe:configure-daily-reset`; the script creates or reuses the `$4.99` Stripe Price using lookup key `pokopia_daily_reset_checklist_v1` and prints the ID to place in the environment. The existing `/api/checkout` endpoint then creates a Stripe Checkout Session and carries `funnel`, `funnel_step`, and `funnel_session` metadata.

The purchase button remains gated until the existing durable order repository and secure delivery provider are connected. This prevents accepting a payment that cannot yet be verified and fulfilled.

The P13 Mini Tool checkout is additionally gated by a server-side paid P06 order with a matching P06 entitlement. Direct route access, manipulated browser context, and direct POST requests without a qualifying source order are rejected.

Sequence 3 applies the same server-side pattern to P13: the Companion route requires a paid P13 order with a matching P13 entitlement. P16 is the approved Companion product and its completed verification is documented in `docs/POKOPIA-COMPANION-SEQUENCE.md`.

Sequence 4 is implemented as a guarded, checkout-disabled Completionist Kit route at `/pokopia/funnel/completionist-kit`. It requires a paid P16 order with a matching P16 entitlement and redirects unqualified visitors to the Companion offer. P17 is reserved as a separate collection/reference layer that excludes P16’s duplicate files: the minimum launch definition is P04’s approved 26-card package plus a finalized/approved P05 field-guide PDF. P05 currently has `pdf_exported=false` and false approval gates; P07 is blocked, P09/P10 are drafts, and P11 is paused. No P17 catalog record, Stripe Price, entitlement, or fulfillment files were invented. See `docs/POKOPIA-COMPLETIONIST-KIT-SEQUENCE.md`.

The Daily Reset fulfillment connection now uses a private Supabase Storage bucket named `digital-products`. `npm run supabase:configure-delivery` creates the private bucket and uploads the A4 and US Letter PDFs. Download requests look up the order in Supabase, require `status = paid` and a matching entitlement, then return one-hour signed URLs for both files. The order fulfillment status changes to `fulfilled` only after signed URLs are created successfully.

## Supabase order storage

The Stripe webhook persists verified paid orders to Supabase/Postgres through `lib/orders/repository.ts`. Run `supabase/migrations/202608290001_create_orders.sql` in the Supabase SQL editor, then add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the server environment. Keep the service-role key server-only; never prefix it with `NEXT_PUBLIC_`.

The unique `provider_session_id` constraint and duplicate handling make webhook retries idempotent. Orders retain the verified Stripe session, product SKU, payment status, amount, customer email, source order ID, funnel session, first/current attribution, pending fulfillment status, and product entitlements. Migration `202608290003_stripe_order_identifiers.sql` has been verified as applied; additive migration `202608290004_add_source_order_id.sql` is required for P13 source-order persistence.

## Reuse for future funnels

To create another game funnel, pass a different published collection into the same structural component or extract the section copy, goal definitions, assessment mappings, and CTA labels into a game-funnel configuration object. Keep all product names, prices, availability, formats, artwork, and Stripe IDs in the centralized catalog.

Before publishing a future funnel, add approved assets, run catalog validation, verify active commerce mappings, and repeat the mobile/accessibility checks at 375px, 390px, and 430px.

## Visual-refinement pass

The refinement pass preserves all funnel behavior while increasing visual escalation. The hero artwork is larger and tighter to the headline; goal cards now behave visually like four distinct doors with build-grid, checklist, guide-page, and collectible motifs; and the problem cards use a more prominent, lightly irregular editorial treatment.

The chaos-to-system section now uses original CSS motifs for scattered notes and organized tools. The starter-kit area has a clearly labeled free-offer badge and structured mockup slot without claiming a real downloadable preview. Assessment controls have stronger progression and touch-target treatment, system panels have distinct color accents, the bundle has premium dark framing while remaining unavailable, and product cards use product-type-specific visual treatments while still showing artwork-pending states.

No copy, product logic, assessment mappings, analytics contracts, attribution behavior, or commerce boundaries were changed. The remaining visual asset needs are documented separately; no fabricated product screenshots or official game assets were introduced.
