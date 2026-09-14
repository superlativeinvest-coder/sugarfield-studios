import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Section } from "@/components/site/Section";
import { getBundleBySlug, getProductsForBundle } from "@/lib/catalog/data";

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) { const slug = (await params).slug; const bundle = getBundleBySlug(slug); if (!bundle) notFound(); const products = getProductsForBundle(slug); return <main><Section eyebrow="Sugarfield bundle" title={bundle.name} intro={bundle.description}><div className="bundle-detail__facts"><span>{bundle.price !== undefined && bundle.currency ? new Intl.NumberFormat("en-US", { style: "currency", currency: bundle.currency }).format(bundle.price) : "Price coming soon"}</span><span>{products.length} configured products</span></div></Section><Section className="catalog-results"><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></Section></main>; }
