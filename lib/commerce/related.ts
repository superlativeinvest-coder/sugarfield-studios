import type { SugarfieldProduct } from "@/lib/catalog/types";

export type ConfiguredBundle = { id: string; slug: string; name: string };
export type RelatedOffer = { kind: "product" | "bundle"; id: string; name: string; href: string };

export function getRelatedOffers(product: SugarfieldProduct, publishedProducts: SugarfieldProduct[], configuredBundles: ConfiguredBundle[] = []): RelatedOffer[] {
  const productOffers = (product.relatedProductIds ?? [])
    .map((id) => publishedProducts.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is SugarfieldProduct => Boolean(candidate && candidate.id !== product.id))
    .map((candidate) => ({ kind: "product" as const, id: candidate.id, name: candidate.name, href: `/products/${candidate.slug}` }));
  const bundleOffers = (product.bundleIds ?? [])
    .map((id) => configuredBundles.find((bundle) => bundle.id === id))
    .filter((bundle): bundle is ConfiguredBundle => Boolean(bundle))
    .map((bundle) => ({ kind: "bundle" as const, id: bundle.id, name: bundle.name, href: `/bundles/${bundle.slug}` }));
  return [...productOffers, ...bundleOffers].filter((offer, index, offers) => offers.findIndex((candidate) => candidate.id === offer.id) === index);
}
