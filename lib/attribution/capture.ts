import type { AttributionState, AttributionValues } from "./types";

const STORAGE_KEY = "sugarfield_attribution";
const queryKeys: Record<string, keyof AttributionValues> = { utm_source: "source", utm_medium: "medium", utm_campaign: "campaign", utm_content: "content", utm_term: "term", ref: "ref", funnel: "funnel" };

function sanitize(value: string | null): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().replace(/[^a-zA-Z0-9._~-]/g, "").slice(0, 120);
  return clean || undefined;
}

export function parseAttribution(search: string): AttributionValues {
  const values: AttributionValues = {};
  const params = new URLSearchParams(search);
  for (const [queryKey, field] of Object.entries(queryKeys)) {
    const value = sanitize(params.get(queryKey));
    if (value) values[field] = value;
  }
  return values;
}

export function captureAttribution(search: string, storage: Pick<Storage, "getItem" | "setItem">): AttributionState {
  const currentTouch = parseAttribution(search);
  let existing: AttributionState | null = null;
  try { const raw = storage.getItem(STORAGE_KEY); if (raw) existing = JSON.parse(raw) as AttributionState; } catch { existing = null; }
  const state: AttributionState = { firstTouch: existing?.firstTouch ?? currentTouch, currentTouch };
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be unavailable; attribution remains non-blocking. */ }
  return state;
}

export { STORAGE_KEY };
