import type { Metadata } from "next";
import { PokopiaDailyResetStage } from "@/components/pokopia/PokopiaDailyResetStage";
import { isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";
export const metadata: Metadata = { title: "Pokopia Daily Reset Checklist | Sugarfield Studio", description: "A repeatable Pokopia organization system from Sugarfield Studio.", alternates: { canonical: "/pokopia/daily-reset" } };
export default function PokopiaDailyResetPage() { return <PokopiaDailyResetStage cumulativeEnabled={isCumulativeCheckoutEnabled()} />; }
