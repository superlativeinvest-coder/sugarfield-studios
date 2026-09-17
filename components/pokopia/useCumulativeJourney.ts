"use client";

import { useCallback, useEffect, useState } from "react";

export type CumulativeJourneyView = { selectedTier: "FREE" | "P06" | "P16" | "P18" | "P17"; currentTotalCents: number };
type JourneyResponse = { journey?: CumulativeJourneyView; nextRoute?: string; error?: string };

export function useCumulativeJourney(enabled: boolean) {
  const [journey, setJourney] = useState<CumulativeJourneyView | null>(null);
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) { setReady(true); return; }
    setReady(false);
    void fetch("/api/pokopia/funnel/journey", { cache: "no-store" })
      .then(async (response) => { const result = await response.json() as JourneyResponse; if (response.ok && result.journey) setJourney(result.journey); })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [enabled]);
  const act = useCallback(async (action: string): Promise<JourneyResponse> => {
    const response = await fetch("/api/pokopia/funnel/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json() as JourneyResponse; if (result.journey) setJourney(result.journey); return result;
  }, []);
  return { journey, ready, act };
}

export function funnelCartSummaryCopy(journey: CumulativeJourneyView | null, label: string, deltaCents: number, newTotalCents: number): string[] {
  const current = journey ? `$${(journey.currentTotalCents / 100).toFixed(2)}` : "…";
  return ["YOUR SETUP", `Current total: ${current}`, `${label}: +$${(deltaCents / 100).toFixed(2)}`, `New total: $${(newTotalCents / 100).toFixed(2)}`];
}
