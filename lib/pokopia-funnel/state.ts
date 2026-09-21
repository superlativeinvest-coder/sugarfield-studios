export const POKOPIA_FUNNEL_STATE_KEY = "sugarfield_pokopia_daily_reset_funnel";
/**
 * Browser state only preserves a visitor's on-page continuity. Purchase and
 * branching decisions are always rechecked from the server-side journey and
 * verified order records.
 */
export type PokopiaFunnelState = { funnelId: "pokopia_daily_reset"; sessionId: string; leadCaptured: boolean; email?: string; entryOffer: "pokopia_quick_start_pack" | "pokopia_session_starter"; dailyResetPurchased: boolean; dailyResetSkipped?: boolean; companionPurchased?: boolean; companionSkipped?: boolean; lastStep: "start" | "daily-reset" | "companion" | "complete-player-system" | "completionist-kit" | "checkout" | "complete"; startedAt: string; utm?: Record<string, string> };
export function createFunnelSession(): PokopiaFunnelState { return { funnelId: "pokopia_daily_reset", sessionId: crypto.randomUUID(), leadCaptured: false, entryOffer: "pokopia_quick_start_pack", dailyResetPurchased: false, lastStep: "start", startedAt: new Date().toISOString() }; }
export function readFunnelState(storage: Pick<Storage, "getItem">): PokopiaFunnelState | null { try { const raw = storage.getItem(POKOPIA_FUNNEL_STATE_KEY); return raw ? JSON.parse(raw) as PokopiaFunnelState : null; } catch { return null; } }
export function writeFunnelState(storage: Pick<Storage, "setItem">, state: PokopiaFunnelState): void { try { storage.setItem(POKOPIA_FUNNEL_STATE_KEY, JSON.stringify(state)); } catch { /* UX continuity is non-blocking. */ } }
