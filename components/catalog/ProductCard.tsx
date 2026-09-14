import Link from "next/link";
import type { SugarfieldProduct } from "@/lib/catalog/types";

function formatPrice(product: SugarfieldProduct): string | null {
  if (product.price === undefined || !product.currency) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.price);
}

export function ProductCard({ product }: { product: SugarfieldProduct }) {
  const price = formatPrice(product);

  return (
    <article className="catalog-card">
      <div className="catalog-card__media" aria-label={`${product.name} image pending`}>
        <span>Product artwork coming soon</span>
      </div>
      <div className="catalog-card__body">
        <p className="catalog-card__meta">{product.game} · {product.productType}</p>
        <h3>{product.name}</h3>
        <p>{product.shortBenefit ?? product.description}</p>
        <div className="catalog-card__footer">
          {price ? <span>{price}</span> : <span>Price coming soon</span>}
          <Link href={`/products/${product.slug}`}>View product</Link>
        </div>
      </div>
    </article>
  );
}
