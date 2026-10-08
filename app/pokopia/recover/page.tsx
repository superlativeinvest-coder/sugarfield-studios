import Link from "next/link";
import { FunnelFrame } from "@/components/pokopia/PokopiaFunnelStage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resume your Pokopia journey | Sugarfield Studio", robots: { index: false, follow: false } };

const messages: Record<string, string> = {
  "offer-unavailable": "That offer is not available for the current journey. Your existing access and any saved selections are still safe.",
  "checkout-unavailable": "There is no unpaid Pokopia selection to check out from this link. You can resume from your secure access panel.",
};

export default async function PokopiaRecoveryPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = messages[reason ?? ""] ?? "We could not safely resume that Pokopia step. Return to your secure access panel to continue.";
  return <FunnelFrame step="complete"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">POKOPIA JOURNEY RECOVERY</p><h1>LET’S GET YOU BACK TO A SAFE START.</h1><p className="focused-funnel__lede" role="status">{message}</p><div className="focused-funnel__actions"><Link className="action-link action-link--primary" href="/pokopia/start#quick-start-access">RETURN TO SECURE ACCESS</Link></div></div></section></FunnelFrame>;
}
