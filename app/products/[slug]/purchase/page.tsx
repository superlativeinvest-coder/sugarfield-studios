import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { PurchaseButton } from "@/components/commerce/PurchaseButton";
import { getProductBySlug } from "@/lib/catalog/data";

export default async function ProductPurchasePage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  return <main><Section className="purchase-page" eyebrow="Secure checkout" title={`Get ${product.name}`} intro="Your purchase will be handled by Stripe. Sugarfield validates the product record and configured Stripe price on the server before creating a session."><PurchaseButton productId={product.id} /></Section></main>;
}
