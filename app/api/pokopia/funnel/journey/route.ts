import { NextResponse } from "next/server";
import { addProductSelection, getP18Readiness, isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";
import { canActOnP17Downsell, canViewP17Downsell, isDoubleSkip, type PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { getOrCreatePokopiaJourney, recordPokopiaJourneyEvent, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { resolveP18Eligibility } from "@/lib/pokopia-funnel/eligibility";
import { getOrderRepository } from "@/lib/orders/repository";
import { getCustomerSession } from "@/lib/customer/session";

const COOKIE = "sf_pokopia_journey";
const actions = ["quick_start_claimed", "daily_reset_viewed", "daily_reset_accepted", "daily_reset_skipped", "companion_viewed", "companion_accepted", "companion_skipped", "p18_viewed", "p18_accepted", "p18_skipped", "p17_downsell_viewed", "p17_accepted", "p17_skipped", "complete"] as const;
type Action = (typeof actions)[number];
type Body = { action?: Action; funnelSessionId?: string; attribution?: { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> } };
type Transition = { journey: PokopiaJourney; changed: boolean; eventName: string; nextRoute?: string; error?: string };

function idFor(request: Request) { const id = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`))?.[1]; return { id: id ?? crypto.randomUUID(), needsCookie: !id }; }
function response(body: object, id: string, needsCookie: boolean) { const next = NextResponse.json(body); if (needsCookie) next.cookies.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 }); return next; }
function details(action: Action) { if (action.startsWith("daily_reset")) return { productId: "P06", offerId: "pokopia_daily_reset_checklist", funnelStep: "daily-reset" }; if (action.startsWith("companion")) return { productId: "P16", offerId: "pokopia_companion", funnelStep: "companion" }; if (action.startsWith("p18")) return { productId: "P18", offerId: "pokopia_complete_player_system", funnelStep: "complete-player-system" }; if (action.startsWith("p17")) return { productId: "P17", offerId: "pokopia_completionist_kit", funnelStep: "completionist-kit" }; return { productId: "FREE-QUICK-START", offerId: "pokopia_quick_start_pack", funnelStep: "start" }; }

function afterCompanion(journey: PokopiaJourney, p18Eligible: boolean): Transition {
  // Current-journey intent has absolute precedence over historical ownership.
  if (isDoubleSkip(journey)) return { journey: { ...journey, p18Eligible: false, p18Bypassed: true, p17Eligible: false, journeyCompleted: true, currentStep: "complete", branchReason: "double_skip_low_intent", completedAt: journey.completedAt ?? new Date().toISOString() }, changed: true, eventName: "pokopia_double_skip_bypassed", nextRoute: "/pokopia/funnel/complete" };
  if (!p18Eligible) return { journey: { ...journey, p18Eligible: false, p18Bypassed: true, currentStep: "complete", journeyCompleted: true, completedAt: journey.completedAt ?? new Date().toISOString() }, changed: true, eventName: "pokopia_funnel_completed", nextRoute: "/pokopia/funnel/complete" };
  return { journey: { ...journey, p18Eligible: true, p18Bypassed: false, currentStep: "complete-player-system" }, changed: true, eventName: "pokopia_p18_qualified", nextRoute: "/pokopia/funnel/complete-player-system" };
}

function transition(journey: PokopiaJourney, action: Action, p18Eligible: boolean): Transition {
  if (action === "quick_start_claimed") return { journey: { ...journey, quickStartClaimed: true, currentStep: "daily-reset" }, changed: !journey.quickStartClaimed, eventName: "pokopia_free_claimed", nextRoute: "/pokopia/funnel/daily-reset" };
  if (action === "daily_reset_viewed") return { journey: { ...journey, dailyResetViewed: true }, changed: !journey.dailyResetViewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "companion_viewed") return { journey: { ...journey, companionViewed: true }, changed: !journey.companionViewed, eventName: "pokopia_funnel_offer_viewed" };
  if (action === "p18_viewed") {
    if (!p18Eligible) return { journey, changed: false, eventName: "pokopia_p18_viewed", error: "The Complete Player System is not available for this journey." };
    return { journey: { ...journey, p18Eligible: true, p18QualifiedView: true, p18Viewed: true, currentStep: "complete-player-system" }, changed: !journey.p18QualifiedView, eventName: "pokopia_p18_viewed" };
  }
  if (action === "p17_downsell_viewed") {
    if (!canViewP17Downsell(journey)) return { journey, changed: false, eventName: "pokopia_p17_downsell_viewed", error: "The Completionist Kit is not available for this journey." };
    return { journey: { ...journey, p17DownsellViewed: true }, changed: !journey.p17DownsellViewed, eventName: "pokopia_p17_downsell_viewed" };
  }
  if (action === "daily_reset_accepted") { const next = addProductSelection({ ...journey, dailyResetAccepted: true, dailyResetSkipped: false, currentStep: "companion" }, "P06"); return { journey: next, changed: !journey.dailyResetAccepted || !journey.selectedProducts.includes("P06"), eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/companion" }; }
  if (action === "daily_reset_skipped") return { journey: { ...journey, dailyResetSkipped: true, currentStep: "companion" }, changed: !journey.dailyResetSkipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: "/pokopia/funnel/companion" };
  if (action === "companion_accepted") { const next = addProductSelection({ ...journey, companionAccepted: true, companionSkipped: false }, "P16"); return afterCompanion(next, true); }
  if (action === "companion_skipped") return afterCompanion({ ...journey, companionSkipped: true }, p18Eligible);
  if (action === "p18_accepted") {
    if (!p18Eligible || !journey.p18QualifiedView || isDoubleSkip(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: "The Complete Player System is not available for this journey." };
    const readiness = getP18Readiness(); if (!readiness.ready) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: readiness.reason };
    return { journey: addProductSelection({ ...journey, p18Accepted: true, p18Skipped: false, currentStep: "checkout" }, "P18"), changed: !journey.p18Accepted || !journey.selectedProducts.includes("P18"), eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/checkout" };
  }
  if (action === "p18_skipped") {
    if (!p18Eligible || !journey.p18QualifiedView || isDoubleSkip(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_skipped", error: "The Complete Player System is not available for this journey." };
    return { journey: { ...journey, p18Eligible: true, p18Skipped: true, p17Eligible: true, currentStep: "completionist-kit" }, changed: !journey.p18Skipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: "/pokopia/funnel/completionist-kit" };
  }
  if (action === "p17_accepted") { if (!canActOnP17Downsell(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_accepted", error: "The Completionist Kit is not available for this journey." }; return { journey: addProductSelection({ ...journey, p17Accepted: true, p17Skipped: false, currentStep: "checkout" }, "P17"), changed: !journey.p17Accepted || !journey.selectedProducts.includes("P17"), eventName: "pokopia_funnel_offer_accepted", nextRoute: "/pokopia/funnel/checkout" }; }
  if (action === "p17_skipped") { if (!canActOnP17Downsell(journey)) return { journey, changed: false, eventName: "pokopia_funnel_offer_skipped", error: "The Completionist Kit is not available for this journey." }; return { journey: { ...journey, p17Skipped: true, currentStep: "checkout" }, changed: !journey.p17Skipped, eventName: "pokopia_funnel_offer_skipped", nextRoute: "/pokopia/funnel/checkout" }; }
  return { journey: { ...journey, journeyCompleted: true, currentStep: "complete", completedAt: journey.completedAt ?? new Date().toISOString() }, changed: !journey.journeyCompleted, eventName: "pokopia_funnel_completed", nextRoute: "/pokopia/funnel/complete" };
}

export async function GET(request: Request) { const identity = idFor(request); try { const journey = await getOrCreatePokopiaJourney(identity.id); return response(journey ? { journey } : { error: "Funnel journey storage is not configured." }, identity.id, identity.needsCookie); } catch { return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie); } }
export async function POST(request: Request) {
  let body: Body; try { body = await request.json() as Body; } catch { return NextResponse.json({ error: "Invalid journey request." }, { status: 400 }); }
  if (!body.action || !actions.includes(body.action)) return NextResponse.json({ error: "Unsupported journey action." }, { status: 400 });
  if (!isCumulativeCheckoutEnabled()) return NextResponse.json({ error: "This staging-only funnel is not enabled." }, { status: 404 });
  const identity = idFor(request);
  try {
    const current = await getOrCreatePokopiaJourney(identity.id); if (!current) return response({ error: "Funnel journey storage is not configured." }, identity.id, identity.needsCookie);
    let verified = { ...current, funnelSessionId: body.funnelSessionId ?? current.funnelSessionId, firstTouchAttribution: current.firstTouchAttribution ?? body.attribution?.firstTouch, currentAttribution: body.attribution?.currentTouch ?? current.currentAttribution };
    const customer = await getCustomerSession(); if (customer && (!verified.customerId || verified.customerId === customer.customer.id)) verified = { ...verified, customerId: customer.customer.id };
    // This resolves from persisted journey and verified order data only.
    const p18Eligible = await resolveP18Eligibility(verified, getOrderRepository(), customer?.customer.id);
    const result = transition(verified, body.action, p18Eligible);
    if (result.error) return response({ error: result.error, journey: verified }, identity.id, identity.needsCookie);
    const saved = await updatePokopiaJourney(identity.id, result.journey); if (!saved) return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie);
    if (result.changed) await recordPokopiaJourneyEvent(identity.id, result.eventName, { ...details(body.action), funnelSessionId: saved.funnelSessionId, firstTouchAttribution: saved.firstTouchAttribution, currentAttribution: saved.currentAttribution, branch: saved.p18Bypassed ? "p18_bypassed" : undefined, branchReason: saved.branchReason, value: saved.currentTotalCents });
    return response({ journey: saved, nextRoute: result.nextRoute }, identity.id, identity.needsCookie);
  } catch { return response({ error: "Funnel journey storage is unavailable." }, identity.id, identity.needsCookie); }
}
