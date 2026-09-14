import type { Metadata } from "next";
import { PokopiaFunnel } from "@/components/pokopia/PokopiaFunnel";
import { getProductsForCollection } from "@/lib/catalog/data";

export const metadata: Metadata = {
  title: "Pokopia Tools | Sugarfield Studio",
  description: "Fan-made Pokopia planners, trackers, reference guides, and collection tools for the way you play.",
  alternates: { canonical: "/pokopia" },
  openGraph: { title: "Your Pokopia adventure, organized. | Sugarfield Studio", description: "Find fan-made Pokopia tools for building, tracking, referencing, and collecting.", type: "website" },
};

export default function PokopiaPage() {
  return <PokopiaFunnel products={getProductsForCollection("pokopia")} />;
}
