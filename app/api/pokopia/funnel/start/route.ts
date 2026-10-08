import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAccessToken, getQuickStartAccessRepository, hashAccessToken } from "@/lib/quick-start/access";
import { QUICK_START_PRODUCT_ID, QUICK_START_SKU } from "@/lib/quick-start/manifest";
import { getEmailProvider } from "@/lib/email/provider";
import { POKOPIA_START_NEXT_ROUTE, normalizeLeadEmail } from "@/lib/pokopia-funnel/start";
import { getOrCreatePokopiaJourney, recordPokopiaJourneyEvent, updatePokopiaLeadDelivery, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { ANONYMOUS_ID_COOKIE, ensureAnonymousId, getAnonymousIdFromCookieHeader, mergePersistedAttribution, normalizeAttributionValues } from "@/lib/attribution/capture";

const JOURNEY_COOKIE = "sf_pokopia_journey";

function readString(value: unknown, max = 120): string | undefined { return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined; }
function readAttribution(value: unknown): Record<string, string> | undefined {
  const result = normalizeAttributionValues(value);
  return Object.keys(result).length ? result : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = normalizeLeadEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const cookieStore = await cookies();
  const existingJourneyId = cookieStore.get(JOURNEY_COOKIE)?.value;
  const journeyId = existingJourneyId ?? crypto.randomUUID();
  const existingAnonymousId = getAnonymousIdFromCookieHeader(request.headers.get("cookie"));
  const anonymousId = existingAnonymousId ?? ensureAnonymousId(undefined, () => undefined);
  const journey = await getOrCreatePokopiaJourney(journeyId, anonymousId);
  if (!journey) return NextResponse.json({ error: "Funnel journey storage is unavailable." }, { status: 503 });

  const funnelSessionId = readString(body?.funnelSessionId);
  const firstTouchAttribution = readAttribution((body?.attribution as Record<string, unknown> | undefined)?.firstTouch);
  const currentAttribution = readAttribution((body?.attribution as Record<string, unknown> | undefined)?.currentTouch);
  const requestedAt = new Date().toISOString();
  const accessRepository = getQuickStartAccessRepository();
  if (!accessRepository) return NextResponse.json({ error: "Free product access storage is not configured yet." }, { status: 503 });

  const token = createAccessToken();
  try {
    await accessRepository.upsert({ email, productId: QUICK_START_PRODUCT_ID, sku: QUICK_START_SKU, funnelSession: funnelSessionId, firstTouchAttribution, currentTouchAttribution: currentAttribution, accessGrantedAt: requestedAt, tokenHash: hashAccessToken(token) });
    const attribution = mergePersistedAttribution(journey.firstTouchAttribution, journey.currentAttribution, firstTouchAttribution, currentAttribution);
    const saved = await updatePokopiaJourney(journeyId, { ...journey, anonymousId: journey.anonymousId ?? anonymousId, leadEmail: email, funnelSessionId: funnelSessionId ?? journey.funnelSessionId, quickStartClaimed: true, currentStep: "daily-reset", firstTouchAttribution: attribution.firstTouch, currentAttribution: attribution.currentTouch, quickStartDeliveryStatus: "queued", quickStartDeliveryRequestedAt: requestedAt, quickStartDeliveryCompletedAt: undefined, quickStartDeliveryFailedAt: undefined, quickStartDeliveryError: undefined });
    if (!saved) return NextResponse.json({ error: "Funnel journey could not be updated." }, { status: 503 });
    await recordPokopiaJourneyEvent(journeyId, "pokopia_free_claimed", { offerId: "pokopia_quick_start_pack", productId: "FREE-QUICK-START", funnelStep: "start", funnelSessionId: saved.funnelSessionId, firstTouchAttribution: saved.firstTouchAttribution, currentAttribution: saved.currentAttribution });

    const provider = getEmailProvider();
    if (!provider) {
      await updatePokopiaLeadDelivery(journeyId, { leadEmail: email, quickStartDeliveryStatus: "not_configured", quickStartDeliveryRequestedAt: requestedAt });
    } else {
      after(async () => {
        try {
          await provider.subscribe(email);
          await updatePokopiaLeadDelivery(journeyId, { leadEmail: email, quickStartDeliveryStatus: "sent", quickStartDeliveryRequestedAt: requestedAt, quickStartDeliveryCompletedAt: new Date().toISOString() });
        } catch (error) {
          const message = error instanceof Error ? error.message.slice(0, 240) : "MailerLite delivery failed.";
          console.error("[pokopia-start] free-pack delivery failed", { journeyId, message });
          try { await updatePokopiaLeadDelivery(journeyId, { leadEmail: email, quickStartDeliveryStatus: "failed", quickStartDeliveryRequestedAt: requestedAt, quickStartDeliveryFailedAt: new Date().toISOString(), quickStartDeliveryError: message }); } catch (statusError) { console.error("[pokopia-start] delivery status update failed", statusError); }
        }
      });
    }

    const response = NextResponse.json({ accessGranted: true, nextRoute: POKOPIA_START_NEXT_ROUTE, journeyId, deliveryStatus: provider ? "queued" : "not_configured" });
    response.cookies.set(JOURNEY_COOKIE, journeyId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set(ANONYMOUS_ID_COOKIE, saved.anonymousId ?? anonymousId, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set("sugarfield_quick_start_access", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    console.error("[pokopia-start] lead capture failed", { journeyId, error });
    return NextResponse.json({ error: "We could not secure your Quick Start Pack right now." }, { status: 503 });
  }
}
