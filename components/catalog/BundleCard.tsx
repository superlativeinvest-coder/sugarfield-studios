import Link from "next/link";
import type { SugarfieldBundle } from "@/lib/catalog/types";

export function BundleCard({ bundle }: { bundle: SugarfieldBundle }) {
  const price = bundle.price !== undefined && bundle.currency ? new Intl.NumberFormat("en-US", { style: "currency", currency: bundle.currency }).format(bundle.price) : "Price coming soon";
  return <article className="bundle-card"><p className="eyebrow">Configured bundle</p><h2>{bundle.name}</h2><p>{bundle.description}</p><div><span>{price}</span><Link href={`/bundles/${bundle.slug}`}>View bundle</Link></div></article>;
}
