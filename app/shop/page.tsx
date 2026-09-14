import type { Metadata } from "next";
import { CatalogIntro } from "@/components/catalog/CatalogIntro";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Section } from "@/components/site/Section";
import { getPublishedProducts } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "Shop | Sugarfield Studio", description: "Browse Sugarfield Studio gaming guides, trackers, planners, and collection tools." };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ type?: string; sort?: string }> }) {
  const filters = await searchParams;
  let products = getPublishedProducts();
  if (filters.type) products = products.filter((product) => product.productType === filters.type);
  if (filters.sort === "new") products = products.filter((product) => product.new);
  return <main><Section><CatalogIntro eyebrow="The Sugarfield shop" title="Tools for the way you play." description="Browse printable guides, trackers, planners, and collection companions. Product details and pricing appear only when approved product data is available." /></Section><Section className="catalog-results"><div className="catalog-results__bar"><span>{products.length} configured {products.length === 1 ? "product" : "products"}</span>{filters.type && <span>Filtered by {filters.type}</span>}{filters.sort === "new" && <span>New products</span>}</div>{products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>No products match this view yet.</h2><p>Try the complete shop.</p></div>}</Section></main>;
}
