# Sugarfield Catalog Migration

## Migration policy

The planned catalog should be migrated in reviewed batches. Each product must retain a stable internal ID and one canonical slug. Product names, prices, artwork, PDFs, formats, page counts, bundle contents, and compatibility claims must come from approved product truth.

## Current repository state

- 4 development product records exist: 3 published records and 1 unpublished validation fixture.
- 3 collections exist, including 2 published collections and 1 unpublished fixture collection.
- 0 bundles are configured.
- No production artwork, PDFs, inventory spreadsheet, pricing table, or Stripe product/price mapping is present.
- The migration is therefore validation-ready but not yet a 110-product content migration.

## Batch process

1. Receive an approved source inventory and asset manifest.
2. Assign or confirm immutable product IDs and canonical slugs.
3. Add records to the centralized catalog source; do not place product facts in page components.
4. Attach only approved artwork and private delivery references.
5. Configure collection membership, player types, relationships, pricing, and publication state.
6. Run `npm run catalog:validate` and resolve every error before publishing a batch.
7. Verify route generation, metadata, responsive cards, image aspect ratios, and product-truth review.
8. Publish the batch only after checkout and delivery mappings are confirmed for products intended for sale.

## Validation coverage

`lib/catalog/validation.ts` checks duplicate IDs/slugs, missing product references, self-related products, missing bundles, published collections/bundles containing unpublished products, required published fields, and missing-artwork warnings.
