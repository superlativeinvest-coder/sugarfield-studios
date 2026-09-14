import { ActionLink } from "@/components/site/ActionLink";
import { Section } from "@/components/site/Section";

export function PlaceholderPage({ eyebrow, title, description, href = "/shop", label = "Explore the shop" }: { eyebrow: string; title: string; description: string; href?: string; label?: string }) {
  return <Section className="placeholder-section" eyebrow={eyebrow} title={title} intro={description}><div className="empty-state"><span aria-hidden="true">✦</span><h3>This commerce milestone is not connected yet.</h3><p>We&apos;ll add this functionality after the product catalog and payment truth are in place.</p><ActionLink href={href}>{label}</ActionLink></div></Section>;
}
