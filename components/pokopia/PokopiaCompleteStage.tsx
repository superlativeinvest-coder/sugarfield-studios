"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FunnelFrame, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";
import { trackFunnelPageView } from "@/lib/analytics/transport";

export function PokopiaCompleteStage({ p18NotQualified = false }: { p18NotQualified?: boolean }) {
  const track = useFunnelTracking();
  useEffect(() => { if (p18NotQualified) void trackFunnelPageView("p18_not_qualified", { funnelStep: "complete", pagePath: window.location.pathname, metadata: { qualification_outcome: "not_qualified" } }); }, [p18NotQualified]);
  useEffect(() => { void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) }); }, []);
  return <FunnelFrame step="complete"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">POKOPIA JOURNEY COMPLETE</p><h1>YOU’RE ALL SET FOR YOUR NEXT SESSION.</h1><p className="focused-funnel__lede">Your current access stays available. When you are ready for more, your verified orders continue to protect your downloads.</p><div className="focused-funnel__actions"><Link className="action-link action-link--primary" href="/pokopia/start" onClick={() => track("pokopia_funnel_completed")}>RETURN TO QUICK START</Link></div></div></section></FunnelFrame>;
}
