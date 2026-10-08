import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PokopiaCompleteStage } from "@/components/pokopia/PokopiaCompleteStage";

export const metadata: Metadata = { title: "Pokopia Journey Complete | Sugarfield Studio", description: "Your Pokopia funnel journey is complete.", alternates: { canonical: "/pokopia/complete" } };
export default async function CompletePage({ searchParams }: { searchParams: Promise<{ reason?: string; session_id?: string }> }) {
  const params = await searchParams;
  // Keep links created before the cumulative success URL changed recoverable.
  // A Checkout session id is only used to locate its server-verified order.
  if (params.session_id) redirect(`/checkout/success?session_id=${encodeURIComponent(params.session_id)}`);
  return <PokopiaCompleteStage p18NotQualified={params.reason === "p18_not_qualified"} />;
}
