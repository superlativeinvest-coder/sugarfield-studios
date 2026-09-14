import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogIntro } from "@/components/catalog/CatalogIntro";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ActionLink } from "@/components/site/ActionLink";
import { Section } from "@/components/site/Section";
import { getCollectionBySlug, getProductsForCollection } from "@/lib/catalog/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const collection = getCollectionBySlug((await params).slug); return collection ? { title: `${collection.name} | Sugarfield Studio`, description: collection.description } : {}; }
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) { const collection = getCollectionBySlug((await params).slug); if (!collection) notFound(); const products = getProductsForCollection(collection.slug); return <main><Section><CatalogIntro eyebrow="Sugarfield collection" title={collection.name} description={collection.description}><ActionLink href="/shop" variant="secondary">View all products</ActionLink></CatalogIntro></Section><Section className="catalog-results"><div className="catalog-results__bar"><span>{products.length} configured {products.length === 1 ? "product" : "products"}</span></div>{products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h2>This collection is being assembled.</h2><p>Approved products will appear here as they are configured.</p></div>}</Section></main>; }
