import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PokopiaCompletionistStage } from "@/components/pokopia/PokopiaCompletionistStage";
import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import { canViewP17Downsell } from "@/lib/pokopia-funnel/journey";
import { getPokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { getP17Readiness, isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";

export const metadata: Metadata = { title: "Pokopia Completionist Kit | Sugarfield Studio", description: "A smaller collection and reference option after the Complete Player System.", alternates: { canonical: "/pokopia/completionist-kit" } };
export const dynamic = "force-dynamic";

export default async function PokopiaCompletionistKitPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  const localPreview = process.env.NODE_ENV !== "production" && preview === "1";
  const journeyId = (await cookies()).get("sf_pokopia_journey")?.value;
  const journey = !localPreview && journeyId ? await getPokopiaJourney(journeyId) : null;
  if (!localPreview && (!journey || !canViewP17Downsell(journey))) redirect("/pokopia/recover?reason=offer-unavailable");
  return <PokopiaCompletionistStage offer={pokopiaFunnelOffers.completionistKit} cumulativeEnabled={isCumulativeCheckoutEnabled()} p17Ready={getP17Readiness().ready} />;
}
