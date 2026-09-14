"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FunnelFrame, useFunnelTracking } from "@/components/pokopia/PokopiaFunnelStage";

export function PokopiaCompleteStage() {
  const track = useFunnelTracking();
  useEffect(() => { void fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) }); }, []);
  return <FunnelFrame step="complete"><section className="focused-funnel__hero focused-funnel__hero--offer"><div className="focused-funnel__copy"><p className="eyebrow">POKOPIA JOURNEY COMPLETE</p><h1>YOU’RE ALL SET FOR YOUR NEXT SESSION.</h1><p className="focused-funnel__lede">Your current access stays available. When you are ready for more, your verified orders continue to protect your downloads.</p><div className="focused-funnel__actions"><Link className="action-link action-link--primary" href="/pokopia/funnel/start" onClick={() => track("pokopia_funnel_completed")}>RETURN TO QUICK START</Link></div></div></section></FunnelFrame>;
}
