import { NextResponse } from "next/server";
import { applyPostCompanionIntent, canActOnP17Downsell, resolvePostCompanionRoute, type PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { getP18Readiness, isCumulativeCheckoutEnabled, isP18Eligible, restorePriorTier, selectTier } from "@/lib/pokopia-funnel/cumulative";
import { getOrCreatePokopiaJourney, recordPokopiaJourneyEvent, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { isVerifiedCompanionBuyer, isVerifiedDailyResetBuyer } from "@/lib/orders/qualification";
import { getOrderRepository } from "@/lib/orders/repository";

const COOKIE = "sf_pokopia_journey";
const actions = ["quick_start_claimed", "daily_reset_viewed", "daily_reset_accepted", "daily_reset_skipped", "companion_viewed", "companion_accepted", "companion_skipped", "p18_viewed", "p18_accepted", "p18_skipped", "p17_downsell_viewed", "p17_accepted", "p17_skipped", "complete"] as const;
type Action = (typeof actions)[number];
type Body = { action?: Action; sourceOrderId?: string; funnelSessionId?: string; attribution?: { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } };

function idFor(request: Request) { const id = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`))?.[1]; return { id: id ?? crypto.randomUUID(), needsCookie: !id }; }
function response(body: object, id: string, needsCookie: boolean) { const next = NextResponse.json(body); if (needsCookie) next.cookies.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 }); return next; }
function details(action: Action) {
  if (action.startsWith("daily_reset")) return { productId: "P06", offerId: "pokopia_daily_reset_checklist", funnelStep: "daily-reset" };
  if (action.startsWith("companion")) return { productId: "P16", offerId: "pokopia_companion", funnelStep: "companion" };
  if (action.startsWith("p18")) return { productId: "P18", offerId: "pokopia_complete_player_system", funnelStep: "complete-player-system" };
  if (action.startsWith("p17")) return { productId: "P17", offerId: "pokopia_completionist_kit", funnelStep: "completionist-kit" };
  return { productId: "FREE-QUICK-START", offerId: "pokopia_quick_start_pack", funnelStep: "start" };
}
function transition(journey: PokopiaJourney, action: Action): { journey: PokopiaJourney; changed: boolean; eventName: string; nextRoute?: string; error?: string } {
  const complete = (next: PokopiaJourney) => ({ journey: next, changed: !journey.journeyCompleted, eventName: "pokopia_funnel_completed" });
  if (action === "quick_start_claimed") return { journey: { ...journey, quickStartClaimed: true, selectedTier: "FREE", currentTotalCents: 0, currentStep: "daily-reset" }, changed: !journey.quickStartClaimed, eventName: "pokopia_funnel_offer_viewed", nextRoute: "/pokopia/funnel/daily-reset" };
  if (action === "daily_reset_viewed") return { journey: { ...journey, dailyResetViewed: true }, changed: !journey.dailyResetViewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "companion_viewed") return { journey: { ...journey, companionViewed: true }, changed: !journey.companionViewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "p18_viewed") return { journey: { ...journey, p18Viewed: true }, changed: !journey.p18Viewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "p17_downsell_viewed") return { journey: { ...journey, p17DownsellViewed: true }, changed: !journey.p17DownsellViewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "daily_reset_accepted") { const next = selectTier({ ...journey, dailyResetAccepted: true, dailyResetSkipped: false, currentStep: "companion" }, "P06"); return { journey: next, changed: journey.selectedTier !== "P06", eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/companion" }; }
  if (action === "companion_accepted") { const next = selectTier({ ...journey, companionAccepted: true, companionSkipped: false, currentStep: "complete-player-system" }, "P16"); return { journey: { ...next, p18Eligible: true }, changed: journey.selectedTier !== "P16", eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/complete-player-system" }; }
  if (action === "daily_reset_skipped") return { journey: { ...journey, dailyResetSkipped: true }, changed: !journey.dailyResetSkipped, eventName: "pokopia_funnel_offer_skipped" };
  if (action === "companion_skipped") { const next = isCumulativeCheckoutEnabled() ? (journey.selectedTier === "FREE" ? { ...journey, companionSkipped: true, p18Eligible: false, p18Bypassed: true, journeyCompleted: true, currentStep: "complete", branchReason: "double_skip_low_intent" as const } : { ...journey, companionSkipped: true, p18Eligible: isP18Eligible(journey), p18Bypassed: false, currentStep: "complete-player-system" }) : applyPostCompanionIntent({ ...journey, companionSkipped: true }); return { journey: next, changed: !journey.companionSkipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: isCumulativeCheckoutEnabled() ? (next.p18Bypassed ? "/pokopia/funnel/complete" : "/pokopia/funnel/complete-player-system") : undefined }; }
  if (action === "p18_accepted") { if (!isCumulativeCheckoutEnabled() || !isP18Eligible(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: "The Complete Player System is not available for this journey." }; const readiness = getP18Readiness(); if (!readiness.ready) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: readiness.reason }; const next = selectTier({ ...journey, p18Accepted: true, p18Skipped: false, currentStep: "checkout" }, "P18"); return { journey: next, changed: journey.selectedTier !== "P18", eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/checkout" }; }
  if (action === "p18_skipped") return { journey: { ...journey, p18Viewed: true, p18Skipped: true, preP17Tier: journey.selectedTier === "P06" || journey.selectedTier === "P16" ? journey.selectedTier : journey.preP17Tier, currentStep: "completionist-kit" }, changed: !journey.p18Skipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: isCumulativeCheckoutEnabled() ? "/pokopia/funnel/completionist-kit" : undefined };
  if (action === "p17_accepted") { if (!isCumulativeCheckoutEnabled() || !canActOnP17Downsell(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: "The Completionist Kit is not available for this journey." }; const priorTier = journey.selectedTier === "P06" ? "P06" : "P16"; const next = selectTier({ ...journey, p17Accepted: true, p17Skipped: false, preP17Tier: priorTier, currentStep: "checkout" }, "P17"); return { journey: next, changed: true, eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/checkout" }; }
  if (action === "p17_skipped") { if (!canActOnP17Downsell(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_skipped", error: "The Completionist Kit is not available for this journey." }; const next = isCumulativeCheckoutEnabled() ? { ...restorePriorTier({ ...journey, p17Skipped: true, currentStep: "checkout" }), p17Skipped: true } : { ...journey, p17Skipped: true, journeyCompleted: true, completedAt: journey.completedAt ?? new Date().toISOString() }; return { journey: next, changed: !journey.p17Skipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: isCumulativeCheckoutEnabled() ? "/pokopia/funnel/checkout" : "/pokopia/funnel/complete" }; }
  return complete({ ...journey, journeyCompleted: true, completedAt: journey.completedAt ?? new Date().toISOString() });
}

export async function GET(request: Request) {
  const identity = idFor(request);
  try { const journey = await getOrCreatePokopiaJourney(identity.id); return response(journey ? { journey } : { error: "Funnel journey storage is not configured." }, identity.id, identity.needsCookie); }
  catch { return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie); }
}
export async function POST(request: Request) {
  let body: Body; try { body = await request.json() as Body; } catch { return NextResponse.json({ error: "Invalid journey request." }, { status: 400 }); }
  if (!body.action || !actions.includes(body.action)) return NextResponse.json({ error: "Unsupported journey action." }, { status: 400 });
  const identity = idFor(request);
  try {
    const current = await getOrCreatePokopiaJourney(identity.id); if (!current) return response({ error: "Funnel journey storage is not configured." }, identity.id, identity.needsCookie);
    let verified: PokopiaJourney = { ...current, funnelSessionId: body.funnelSessionId ?? current.funnelSessionId, firstTouchAttribution: current.firstTouchAttribution ?? body.attribution?.firstTouch, currentAttribution: body.attribution?.currentTouch ?? current.currentAttribution };
    if ((body.action === "companion_skipped" || body.action === "p18_viewed" || body.action === "p18_skipped") && body.sourceOrderId) {
      const order = await getOrderRepository()?.findById(body.sourceOrderId);
      if (order && isVerifiedDailyResetBuyer(order)) verified = applyPostCompanionIntent({ ...verified, dailyResetPurchased: true });
      if (order && isVerifiedCompanionBuyer(order)) verified = applyPostCompanionIntent({ ...verified, companionPurchased: true });
    }
    const result = transition(verified, body.action); if (result.error) return response({ error: result.error, journey: verified }, identity.id, identity.needsCookie); const saved = await updatePokopiaJourney(identity.id, result.journey);
    if (!saved) return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie);
    if (result.changed) await recordPokopiaJourneyEvent(identity.id, result.eventName, { ...details(body.action), funnelSessionId: saved.funnelSessionId, firstTouchAttribution: saved.firstTouchAttribution, currentAttribution: saved.currentAttribution, branch: saved.p18Bypassed ? "p18_bypassed" : undefined, branchReason: saved.branchReason });
    return response({ journey: saved, nextRoute: result.nextRoute ?? (body.action === "companion_skipped" ? resolvePostCompanionRoute(saved) : undefined) }, identity.id, identity.needsCookie);
  } catch { return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie); }
}
