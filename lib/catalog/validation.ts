import type { SugarfieldBundle, SugarfieldCollection, SugarfieldProduct } from "./types";

export type CatalogValidationIssue = { level: "error" | "warning"; message: string };
export type CatalogValidationResult = { errors: CatalogValidationIssue[]; warnings: CatalogValidationIssue[] };

function duplicateIssues(values: string[], label: string): CatalogValidationIssue[] {
  const seen = new Set<string>();
  return values.filter((value) => seen.has(value) || !seen.add(value)).map((value) => ({ level: "error", message: `Duplicate ${label}: ${value}` }));
}

export function validateCatalog(products: SugarfieldProduct[], collections: SugarfieldCollection[], bundles: SugarfieldBundle[]): CatalogValidationResult {
  const errors: CatalogValidationIssue[] = [];
  const warnings: CatalogValidationIssue[] = [];
  errors.push(...duplicateIssues(products.map((item) => item.id), "product ID"), ...duplicateIssues(products.map((item) => item.slug), "product slug"));
  errors.push(...duplicateIssues(collections.map((item) => item.id), "collection ID"), ...duplicateIssues(collections.map((item) => item.slug), "collection slug"));
  errors.push(...duplicateIssues(bundles.map((item) => item.id), "bundle ID"), ...duplicateIssues(bundles.map((item) => item.slug), "bundle slug"));

  const productIds = new Set(products.map((product) => product.id));
  const publishedProductIds = new Set(products.filter((product) => product.published).map((product) => product.id));
  const bundleIds = new Set(bundles.map((bundle) => bundle.id));
  for (const product of products) {
    if (product.published && (!product.name.trim() || !product.game.trim() || !product.description.trim())) errors.push({ level: "error", message: `Published product ${product.id} is missing required descriptive truth.` });
    if (product.published && !product.images.hero && !product.images.gallery?.length) warnings.push({ level: "warning", message: `Published product ${product.id} has no approved artwork configured.` });
    for (const relatedId of product.relatedProductIds ?? []) {
      if (!productIds.has(relatedId)) errors.push({ level: "error", message: `Product ${product.id} references missing related product ${relatedId}.` });
      if (relatedId === product.id) errors.push({ level: "error", message: `Product ${product.id} cannot relate to itself.` });
    }
    for (const bundleId of product.bundleIds ?? []) if (!bundleIds.has(bundleId)) errors.push({ level: "error", message: `Product ${product.id} references missing bundle ${bundleId}.` });
  }
  for (const collection of collections) {
    for (const productId of collection.productIds) {
      if (!productIds.has(productId)) errors.push({ level: "error", message: `Collection ${collection.id} references missing product ${productId}.` });
      if (collection.published && !publishedProductIds.has(productId)) errors.push({ level: "error", message: `Published collection ${collection.id} references unpublished product ${productId}.` });
    }
  }
  for (const bundle of bundles) for (const productId of bundle.productIds) {
    if (!productIds.has(productId)) errors.push({ level: "error", message: `Bundle ${bundle.id} references missing product ${productId}.` });
    if (bundle.published && !publishedProductIds.has(productId)) errors.push({ level: "error", message: `Published bundle ${bundle.id} references unpublished product ${productId}.` });
  }
  return { errors, warnings };
}
