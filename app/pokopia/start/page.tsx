import type { Metadata } from "next";
import { PokopiaStarterStage } from "@/components/pokopia/PokopiaStarterStage";
export const metadata: Metadata = { title: "Free Pokopia Session Starter | Sugarfield Studio", description: "Organize your next Pokopia session with a free Sugarfield Studio starter tool.", alternates: { canonical: "/pokopia/start" } };
export default function PokopiaStartPage() { return <PokopiaStarterStage />; }
