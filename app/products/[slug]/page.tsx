import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductFunnel } from "@/components/catalog/ProductFunnel";
import { getProductBySlug, getPublishedProducts } from "@/lib/catalog/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const product = getProductBySlug((await params).slug); return product ? { title: `${product.name} | Sugarfield Studio`, description: product.description, alternates: { canonical: `/products/${product.slug}` } } : {}; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const product = getProductBySlug((await params).slug); if (!product) notFound(); const publishedProducts = getPublishedProducts(); const relatedProducts = (product.relatedProductIds ?? []).map((id) => publishedProducts.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item && item.id !== product.id)); return <ProductFunnel product={product} relatedProducts={relatedProducts} bundleNames={product.bundleIds ?? []} />; }
