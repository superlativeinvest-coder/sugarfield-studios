import Link from "next/link";
import type { RelatedOffer } from "@/lib/commerce/related";

export function RelatedOffers({ offers }: { offers: RelatedOffer[] }) {
  if (!offers.length) return null;
  return <div className="related-links">{offers.map((offer) => <Link key={`${offer.kind}-${offer.id}`} href={offer.href}><span><small>{offer.kind === "bundle" ? "Bundle" : "Related product"}</small>{offer.name}</span><b aria-hidden="true">→</b></Link>)}</div>;
}
