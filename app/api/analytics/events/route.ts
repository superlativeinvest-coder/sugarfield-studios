import { getCustomerSession } from "@/lib/customer/session";
import { getAnonymousIdFromCookieHeader, normalizeAttributionState } from "@/lib/attribution/capture";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validateAnalyticsClientPayload, type ValidatedAnalyticsClientPayload } from "@/lib/analytics/contract";
import { isValidAnonymousId } from "@/lib/attribution/capture";
import { insertAnalyticsEventRow } from "@/lib/analytics/server";

const journeyCookie = "sf_pokopia_journey";

type JourneyContext = {
  id?: string;
  anonymousId?: string;
  firstTouch?: Record<string, string>;
  currentTouch?: Record<string, string>;
};

function uuid(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

function cookieValue(header: string | null, name: string): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function classifyUserAgent(value: string | null): { deviceType: string; browser: string; os: string } {
  const ua = value ?? "";
  const deviceType = /ipad|tablet|kindle|silk/i.test(ua) ? "tablet" : /mobile|iphone|ipod|android/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome\//i.test(ua) ? "Chrome" : /firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) && !/chrome\//i.test(ua) ? "Safari" : /opr\//i.test(ua) ? "Opera" : "Other";
  const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /mac os x/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { deviceType, browser, os };
}

function attributionFields(state: ReturnType<typeof normalizeAttributionState>) {
  const first = state?.firstTouch ?? {};
  const current = state?.currentTouch ?? {};
  return {
    source: current.utm_source,
    medium: current.utm_medium,
    campaign: current.utm_campaign,
    content_id: current.content_id ?? current.utm_content,
    term: current.utm_term,
    utm_source: current.utm_source,
    utm_medium: current.utm_medium,
    utm_campaign: current.utm_campaign,
    utm_content: current.utm_content,
    utm_term: current.utm_term,
    ttclid: current.ttclid,
    landing_page: current.landing_page ?? first.landing_page,
    referrer: current.referrer ?? first.referrer,
    firstTouch: first,
    currentTouch: current,
  };
}

async function readJourneyContext(client: NonNullable<ReturnType<typeof getSupabaseServerClient>>, id: string | undefined): Promise<JourneyContext> {
  if (!id) return {};
  const { data, error } = await client.from("funnel_journeys").select("id,anonymous_id,first_touch_attribution,current_attribution").eq("id", id).maybeSingle();
  if (error || !data) return {};
  const attribution = normalizeAttributionState({ firstTouch: data.first_touch_attribution, currentTouch: data.current_attribution });
  return { id: data.id, anonymousId: isValidAnonymousId(data.anonymous_id) ? data.anonymous_id : undefined, firstTouch: attribution?.firstTouch, currentTouch: attribution?.currentTouch };
}

function analyticsRow(payload: ValidatedAnalyticsClientPayload, request: Request, journey: JourneyContext, anonymousId: string | undefined, userId: string | undefined) {
  const bodyAttribution = normalizeAttributionState(payload.attribution);
  const persistedAttribution = journey.firstTouch || journey.currentTouch ? { firstTouch: journey.firstTouch ?? {}, currentTouch: journey.currentTouch ?? {} } : null;
  const attribution = normalizeAttributionState(persistedAttribution) ?? bodyAttribution;
  const fields = attributionFields(attribution);
  const device = classifyUserAgent(request.headers.get("user-agent"));
  const referrer = payload.referrer ?? fields.referrer ?? request.headers.get("referer") ?? undefined;
  const now = new Date().toISOString();
  return {
    event_id: payload.eventId,
    event_name: payload.eventName,
    occurred_at: payload.occurredAt ?? now,
    received_at: now,
    journey_id: journey.id ?? null,
    anonymous_id: journey.anonymousId ?? anonymousId ?? null,
    user_id: userId ?? null,
    session_id: payload.sessionId ?? null,
    source: fields.source ?? null,
    medium: fields.medium ?? null,
    campaign: fields.campaign ?? null,
    content_id: fields.content_id ?? null,
    term: fields.term ?? null,
    utm_source: fields.utm_source ?? null,
    utm_medium: fields.utm_medium ?? null,
    utm_campaign: fields.utm_campaign ?? null,
    utm_content: fields.utm_content ?? null,
    utm_term: fields.utm_term ?? null,
    ttclid: fields.ttclid ?? null,
    landing_page: payload.landingPage ?? fields.landing_page ?? null,
    page_path: payload.pagePath ?? null,
    referrer,
    funnel_step: payload.funnelStep ?? null,
    previous_step: payload.previousStep ?? null,
    product_id: payload.productId ?? null,
    product_price_cents: payload.productPriceCents ?? null,
    selected_products: payload.selectedProducts ?? null,
    cart_value_cents: payload.cartValueCents ?? null,
    order_id: null,
    revenue_cents: null,
    currency: "USD",
    device_type: device.deviceType,
    browser: device.browser,
    os: device.os,
    metadata: {
      ...(payload.metadata ?? {}),
      attribution_first_touch: fields.firstTouch,
      attribution_current_touch: fields.currentTouch,
      transport: "browser_server_endpoint",
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid analytics JSON." }, { status: 400 }); }
  const validated = validateAnalyticsClientPayload(raw);
  if (!validated.ok) return Response.json({ ok: false, error: validated.error }, { status: 400 });
  const client = getSupabaseServerClient();
  if (!client) {
    console.error("[analytics] server client unavailable");
    return Response.json({ ok: false, persisted: false, eventId: validated.value.eventId }, { status: 202 });
  }
  try {
    const cookieHeader = request.headers.get("cookie");
    const cookieJourneyId = uuid(cookieValue(cookieHeader, journeyCookie));
    const cookieAnonymousId = getAnonymousIdFromCookieHeader(cookieHeader);
    const journey = await readJourneyContext(client, cookieJourneyId);
    const session = await getCustomerSession();
    const row = analyticsRow(validated.value, request, journey, cookieAnonymousId, session?.customer.id);
    const inserted = await insertAnalyticsEventRow(row, client);
    if (!inserted.ok) return Response.json({ ok: false, persisted: false, eventId: validated.value.eventId }, { status: 202 });
    return Response.json({ ok: true, persisted: true, deduplicated: inserted.deduplicated, eventId: validated.value.eventId });
  } catch (error) {
    console.error("[analytics] transport failed", error);
    return Response.json({ ok: false, persisted: false, eventId: validated.value.eventId }, { status: 202 });
  }
}
