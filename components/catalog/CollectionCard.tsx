import Link from "next/link";
import type { SugarfieldCollection } from "@/lib/catalog/types";

export function CollectionCard({ collection }: { collection: SugarfieldCollection }) {
  return (
    <article className="collection-card">
      <div className="collection-card__accent" aria-hidden="true" />
      <div>
        <p className="catalog-card__meta">{collection.game ?? "Sugarfield Studio"}</p>
        <h3>{collection.name}</h3>
        <p>{collection.description}</p>
        <Link href={`/collections/${collection.slug}`}>Explore collection</Link>
      </div>
    </article>
  );
}
