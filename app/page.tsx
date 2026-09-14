import type { Metadata } from "next";
import { BundleSection, FinalCtaSection, FeaturedProductSection, FutureToolsSection, GameCollectionsSection, Hero, HowItWorksSection, NewProductsSection, PlayerTypesSection, PokopiaSection, ProblemSection, SignupSection, WhySection, FinderSection, StudioSignalsSection } from "@/components/home/HomeSections";

export const metadata: Metadata = {
  title: "Sugarfield Studio | Gaming Guides, Trackers, Planners & Collector Tools",
  description: "Printable guides, trackers, planners, checklists, and gaming tools for cozy gamers, collectors, builders, and completionists.",
  alternates: { canonical: "/" },
  openGraph: { title: "Sugarfield Studio | Gaming tools for the way you play", description: "Printable guides, trackers, planners, checklists, and gaming tools for cozy gamers, collectors, builders, and completionists.", type: "website" },
};

export default function HomePage() { return <main><Hero /><StudioSignalsSection /><ProblemSection /><PlayerTypesSection /><PokopiaSection /><GameCollectionsSection /><HowItWorksSection /><FeaturedProductSection /><BundleSection /><NewProductsSection /><FinderSection /><WhySection /><FutureToolsSection /><SignupSection /><FinalCtaSection /></main>; }
