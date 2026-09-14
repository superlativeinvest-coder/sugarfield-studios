import type { Metadata } from "next";
import { PokopiaCompleteStage } from "@/components/pokopia/PokopiaCompleteStage";

export const metadata: Metadata = { title: "Pokopia Journey Complete | Sugarfield Studio", description: "Your Pokopia funnel journey is complete." };
export default function CompletePage() { return <PokopiaCompleteStage />; }
