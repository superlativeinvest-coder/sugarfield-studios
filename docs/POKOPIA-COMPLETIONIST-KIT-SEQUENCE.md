# Pokopia Funnel — Sequence 4: Completionist Kit

Status: Product definition ready for approval. Checkout remains disabled.

## Product definition

The Completionist Kit is reserved as the highest-depth Pokopia utility offer for players who want to organize, reference, and complete more of the game. It must be broader than P16, which contains the P14 Cloud Islands Planner and P15 Spawn Tracker Guide, without becoming an uncurated ZIP of unrelated files.

Reserved identity: Pokopia Completionist Kit, product ID/SKU/entitlement `P17`, offer `pokopia_completionist_kit`, funnel step `completionist-kit`.

Product decision: P17 will be a separate completion/reference layer and will not include P16’s P14/P15 files. This avoids asking a P16 buyer to repurchase the same planner and tracker. P17’s distinct value is collection reference and field-guide material, with broader habitat, recipe, and reference additions reserved for later approved updates.

Promise: Help a completion-focused Pokopia player organize collection progress and keep a useful field/reference system close while they work through the game. The ideal buyer has outgrown session/event tracking and wants a persistent collection/reference layer; the P16 buyer is the natural audience because P16 already established the planning and spawn-progress workflow.

## Asset audit

- P04 — Pokopia Field Guide 26-Card Collection: live, 26-card ZIP; useful collection material, but not sufficient alone for the top-tier promise.
- P05 — Pokopia Field Guide PDF + Collector Cards Bundle: live legacy metadata, field-guide PDF plus card ZIP; requires customer-package and approval review before inclusion.
- P07 — Pokopia Cooking Recipes + Flavor Guide: blocked on visual regeneration; exclude from production fulfillment.
- P09 — Pokopia 209-Habitat Master Checklist: draft with multiple experimental exports; exclude until one canonical export is approved.
- P10 — Pokopia Paint Recipe Reference: draft; exclude until approved.
- P11 — Pokopia Habitat Bookmark Set: paused pending art review; exclude until resumed and approved.

## Minimum viable launch definition

Core launch contents, after finishing and approving the source files:

1. P04’s unique 26-card collection as one canonical customer package. Card 27 Bonus is not part of the core until separately approved.
2. P05’s field-guide portion as one finalized customer PDF. P05’s duplicate card set is intentionally excluded because it is the same P04 card collection.

P16 is not included. P04 and P05 remain standalone products. P07 cooking, P09 habitat, and P10 paint resources are future additions only after their own approval gates pass. P11 bookmarks are an optional bonus at most and remain paused.

## Customer file manifest

| Resource | Source | Proposed canonical customer file | Format | Status |
| --- | --- | --- | --- | --- |
| Field-guide reference | P05 source | `pokopia-completionist-kit-field-guide.pdf` | PDF; Letter and A4 export required | Existing source PDF, but `pdf_exported=false` and approval gates are false; needs final export and approval |
| Collection cards | P04 | `pokopia-completionist-kit-26-card-collection.zip` | ZIP of 26 PNG cards | Existing P04 ZIP contains 26 numbered cards; source/PDF/listing/publish approval gates are false |
| Bonus card | P04 | `pokopia-completionist-kit-card-27-bonus.png` | PNG | Existing in source ZIP, optional only; not core until approved |

No P16 files, P07/P09/P10/P11 files, or invented filenames are customer deliverables at launch.

## Pricing recommendation

- Recommended standalone price: `$14.99 USD`.
- Recommended verified-P16 upgrade price: `$9.99 USD`, implemented later as a distinct P16-buyer price/mapping rather than hidden discount logic.
- Rationale: P13 is `$3.99`, P16 is `$7.99`, and P05’s legacy metadata is `$11.99`; P17 needs to sit above that anchor while the P16-owner price recognizes that the buyer already owns the earlier planning layer.

The separate P17 package and dedicated upgrade price prevent double payment for P14/P15. No price has been configured yet.

## Implemented route and security

`/pokopia/funnel/completionist-kit` requires a server-verified paid P16 order with a matching P16 entitlement. URL parameters are lookup hints only; browser storage, client flags, and arbitrary product IDs are not purchase truth. Unqualified visitors redirect to `/pokopia/funnel/companion`.

The offer is visibly disabled and has no P17 catalog or Stripe mapping. The checkout API rejects the canonical P17 upgrade unless a real published product and Stripe Price are later configured, and it rechecks the source P16 order server-side.

## Remaining work before enabling checkout

1. Approve this P17 definition and the `$14.99` standalone / `$9.99` P16-owner pricing structure.
2. Re-export and approve the P05 field-guide PDF in Letter and A4 formats.
3. Approve the P04 source cards and create the clean 26-card P17 ZIP; decide separately whether Card 27 becomes a bonus.
4. Create P17 cover, hero, included-content, preview-montage, and Letter/A4 format artwork using only approved files.
5. Add the approved package to the catalog and private Supabase Storage fulfillment map, then create distinct Stripe test Product/Price mappings.
6. Run the full P16 → P17 test-mode purchase, webhook, entitlement, idempotency, signed-download, and regression verification.

Sequence 4 ends at its own confirmation page when enabled. No later paid sequence is created or started.
