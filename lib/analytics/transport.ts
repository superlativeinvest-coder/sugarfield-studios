import { ANONYMOUS_ID_COOKIE, captureAttribution, getAnonymousIdFromCookieHeader, readStoredAttribution } from "@/lib/attribution/capture";
import type { TrackFunnelEventInput } from "./contract";
import type { CanonicalAnalyticsEventName } from "./taxonomy";
import { dispatchTikTokEvent } from "./tiktok-pixel";

export type TrackFunnelEventResult = { ok: boolean; eventId: string; persisted?: boolean; deduplicated?: boolean };
const ROUTE_VISIT_STATE_KEY = "__sugarfield_route_visit_id";
const ROUTE_VISIT_PATH_STATE_KEY = "__sugarfield_route_visit_path";

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generatedEventId(): string {
  return globalThis.crypto.randomUUID();
}

export async function trackFunnelEvent(input: TrackFunnelEventInput): Promise<TrackFunnelEventResult> {
  const eventId = input.eventId ?? generatedEventId();
  if (typeof window === "undefined" || typeof window.fetch !== "function") return { ok: false, eventId };
  dispatchTikTokEvent(input, eventId);
  try {
    const attribution = input.attribution ?? readStoredAttribution(window.localStorage, window.sessionStorage) ?? captureAttribution(window.location.search, window.localStorage, window.sessionStorage, { landingPage: window.location.pathname, referrer: window.document.referrer });
    const anonymousId = input.anonymousId ?? getAnonymousIdFromCookieHeader(window.document.cookie);
    const response = await window.fetch("/api/analytics/events", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, eventId, attribution, ...(anonymousId ? { anonymousId } : {}) }),
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; persisted?: boolean; deduplicated?: boolean };
    return { ok: response.ok && result.ok !== false, eventId, persisted: result.persisted, deduplicated: result.deduplicated };
  } catch (error) {
    console.error("[analytics] browser transport failed", error);
    return { ok: false, eventId };
  }
}

export function getRouteVisitId(): string {
  const current = window.history.state?.[ROUTE_VISIT_STATE_KEY];
  const currentPath = window.history.state?.[ROUTE_VISIT_PATH_STATE_KEY];
  if (validUuid(current) && currentPath === window.location.pathname) return current;
  const created = generatedEventId();
  window.history.replaceState({ ...(window.history.state ?? {}), [ROUTE_VISIT_STATE_KEY]: created, [ROUTE_VISIT_PATH_STATE_KEY]: window.location.pathname }, "", window.location.href);
  return created;
}

export function routePageViewEventId(eventName: Exclude<CanonicalAnalyticsEventName, "purchase_completed">, route = window.location.pathname): string {
  const routeVisitId = getRouteVisitId();
  const storageKey = `sugarfield_page_view_event:${routeVisitId}:${route}:${eventName}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (validUuid(existing)) return existing;
    const created = generatedEventId();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return generatedEventId();
  }
}

export function trackFunnelPageView(eventName: Exclude<CanonicalAnalyticsEventName, "purchase_completed">, input: Omit<TrackFunnelEventInput, "eventName" | "eventId"> = {}): Promise<TrackFunnelEventResult> {
  const route = window.location.pathname;
  const routeVisitId = getRouteVisitId();
  const eventId = routePageViewEventId(eventName, route);
  return trackFunnelEvent({ ...input, eventName, eventId, pagePath: input.pagePath ?? route, metadata: { ...(input.metadata ?? {}), route_visit_id: routeVisitId } });
}

export { ANONYMOUS_ID_COOKIE };
