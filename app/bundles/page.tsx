import type { Metadata } from "next";
import { BundleCard } from "@/components/catalog/BundleCard";
import { getPublishedBundles } from "@/lib/catalog/data";
import { Section } from "@/components/site/Section";
export const metadata: Metadata = { title: "Bundles | Sugarfield Studio", description: "Curated Sugarfield Studio gaming tool bundles." };
export default function BundlesPage() { const bundles = getPublishedBundles(); return <main><Section eyebrow="Sugarfield bundles" title="Build your gaming toolkit." intro="Bundles group related Sugarfield tools around a specific goal, with contents and pricing kept clear.">{bundles.length ? <div className="bundle-grid">{bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}</div> : <div className="empty-state"><span aria-hidden="true">✦</span><h3>Bundles are being assembled</h3><p>Configured bundles will appear here as their product contents, pricing, and checkout mapping are approved.</p></div>}</Section></main>; }
