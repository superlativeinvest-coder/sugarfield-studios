import type { AttributionState, AttributionValues } from "./types";

export const STORAGE_KEY = "sugarfield_attribution";
export const ANONYMOUS_ID_COOKIE = "sf_anonymous_id";
export const ANONYMOUS_ID_MAX_AGE = 60 * 60 * 24 * 365;

const legacyQueryKeys: Record<string, keyof AttributionValues> = { ref: "ref", funnel: "funnel" };
const anonymousIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type StorageLike = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

function sanitizeToken(value: string | null | undefined, max = 120): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().replace(/[^a-zA-Z0-9._~%-]/g, "").slice(0, max);
  return clean || undefined;
}
function sanitizeUrl(value: string | null | undefined, max = 2048): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
  return clean || undefined;
}
function pick(value: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) { const raw = value[key]; if (typeof raw === "string") { const clean = sanitizeToken(raw); if (clean) return clean; } }
  return undefined;
}
function pickUrl(value: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) { const raw = value[key]; if (typeof raw === "string") { const clean = sanitizeUrl(raw); if (clean) return clean; } }
  return undefined;
}

export function normalizeAttributionValues(value: unknown): AttributionValues {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const utmContent = pick(input, "utm_content", "content");
  const source = pick(input, "utm_source", "source");
  const medium = pick(input, "utm_medium", "medium");
  const campaign = pick(input, "utm_campaign", "campaign");
  const term = pick(input, "utm_term", "term");
  const ttclid = pick(input, "ttclid");
  const landingPage = pickUrl(input, "landing_page", "landingPage");
  const referrer = pickUrl(input, "referrer");
  const ref = pick(input, "ref");
  const funnel = pick(input, "funnel");
  const contentId = pick(input, "content_id") ?? utmContent;
  return {
    ...(source ? { utm_source: source } : {}),
    ...(medium ? { utm_medium: medium } : {}),
    ...(campaign ? { utm_campaign: campaign } : {}),
    ...(utmContent ? { utm_content: utmContent } : {}),
    ...(contentId ? { content_id: contentId } : {}),
    ...(term ? { utm_term: term } : {}),
    ...(ttclid ? { ttclid } : {}),
    ...(landingPage ? { landing_page: landingPage } : {}),
    ...(referrer ? { referrer } : {}),
    ...(ref ? { ref } : {}),
    ...(funnel ? { funnel } : {}),
  };
}

export function normalizeAttributionState(value: unknown): AttributionState | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const firstTouch = normalizeAttributionValues(input.firstTouch ?? input.first_touch_attribution);
  const currentTouch = normalizeAttributionValues(input.currentTouch ?? input.current_touch_attribution ?? input.currentAttribution);
  if (!Object.keys(firstTouch).length && !Object.keys(currentTouch).length) return null;
  return { firstTouch, currentTouch };
}

export function toLegacyAttribution(values: AttributionValues): Record<string, string> {
  return {
    ...(values.utm_source ? { source: values.utm_source } : {}),
    ...(values.utm_medium ? { medium: values.utm_medium } : {}),
    ...(values.utm_campaign ? { campaign: values.utm_campaign } : {}),
    ...(values.utm_content ? { content: values.utm_content } : {}),
    ...(values.utm_term ? { term: values.utm_term } : {}),
    ...(values.ref ? { ref: values.ref } : {}),
    ...(values.funnel ? { funnel: values.funnel } : {}),
  };
}

export function hasRecognizedAttribution(value: AttributionValues): boolean {
  const source = value.utm_source?.toLowerCase();
  const medium = value.utm_medium?.toLowerCase();
  return Boolean((source && source !== "direct" && source !== "none") || (medium && medium !== "none") || value.utm_campaign || value.utm_content || value.utm_term || value.ttclid || value.ref || value.funnel);
}

function directAttribution(values: AttributionValues): AttributionValues {
  return { utm_source: "direct", utm_medium: "none", ...(values.landing_page ? { landing_page: values.landing_page } : {}), ...(values.referrer ? { referrer: values.referrer } : {}) };
}

export function parseAttribution(search: string, context: { landingPage?: string; referrer?: string } = {}): AttributionValues {
  const params = new URLSearchParams(search);
  const values: AttributionValues = {};
  const setToken = (parameter: string, field: keyof AttributionValues) => { const value = sanitizeToken(params.get(parameter)); if (value) values[field] = value; };
  setToken("utm_source", "utm_source"); setToken("utm_medium", "utm_medium"); setToken("utm_campaign", "utm_campaign"); setToken("utm_content", "utm_content"); setToken("utm_term", "utm_term"); setToken("ttclid", "ttclid");
  for (const [parameter, field] of Object.entries(legacyQueryKeys)) setToken(parameter, field);
  if (values.utm_content) values.content_id = values.utm_content;
  const landingPage = sanitizeUrl(context.landingPage); const referrer = sanitizeUrl(context.referrer);
  if (landingPage) values.landing_page = landingPage;
  if (referrer) values.referrer = referrer;
  return values;
}

function readState(storage: StorageLike | undefined): AttributionState | null {
  if (!storage) return null;
  try { const raw = storage.getItem(STORAGE_KEY); return raw ? normalizeAttributionState(JSON.parse(raw)) : null; } catch { return null; }
}

export function readStoredAttribution(storage?: StorageLike, legacyStorage?: StorageLike): AttributionState | null {
  const current = readState(storage); if (current) return current;
  const legacy = readState(legacyStorage);
  if (legacy && storage) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(legacy)); } catch { /* Storage may be unavailable. */ }
    try { legacyStorage?.removeItem?.(STORAGE_KEY); } catch { /* Legacy cleanup is best effort. */ }
  }
  return legacy;
}

export function captureAttribution(search: string, storage: StorageLike, legacyStorage?: StorageLike, context: { landingPage?: string; referrer?: string } = {}): AttributionState {
  const existing = readStoredAttribution(storage, legacyStorage); const parsed = parseAttribution(search, context); const recognized = hasRecognizedAttribution(parsed);
  const firstTouch = existing?.firstTouch ?? (recognized ? parsed : directAttribution(parsed));
  const currentTouch = recognized ? parsed : existing?.currentTouch ?? directAttribution(parsed);
  const state: AttributionState = { firstTouch, currentTouch };
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Attribution remains non-blocking. */ }
  return state;
}

export function mergePersistedAttribution(existingFirst: unknown, existingCurrent: unknown, incomingFirst: unknown, incomingCurrent: unknown): { firstTouch: Record<string, string> | undefined; currentTouch: Record<string, string> | undefined } {
  const first = normalizeAttributionValues(existingFirst); const incomingFirstValues = normalizeAttributionValues(incomingFirst); const current = normalizeAttributionValues(existingCurrent); const incomingCurrentValues = normalizeAttributionValues(incomingCurrent);
  const nextFirst = Object.keys(first).length ? first : incomingFirstValues;
  const nextCurrent = hasRecognizedAttribution(incomingCurrentValues) || !Object.keys(current).length ? incomingCurrentValues : current;
  return { firstTouch: Object.keys(nextFirst).length ? nextFirst : undefined, currentTouch: Object.keys(nextCurrent).length ? nextCurrent : undefined };
}

export function isValidAnonymousId(value: string | undefined | null): value is string { return Boolean(value && anonymousIdPattern.test(value)); }
export function getAnonymousIdFromCookieHeader(cookieHeader: string | null | undefined): string | undefined {
  const value = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ANONYMOUS_ID_COOKIE}=`))?.slice(ANONYMOUS_ID_COOKIE.length + 1);
  return isValidAnonymousId(value) ? value : undefined;
}
export function ensureAnonymousId(cookieHeader: string | null | undefined, setCookie: (value: string) => void): string {
  const existing = getAnonymousIdFromCookieHeader(cookieHeader); if (existing) return existing;
  const created = globalThis.crypto.randomUUID(); setCookie(created); return created;
}
export function anonymousIdCookieValue(value: string): string { return `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(value)}; Max-Age=${ANONYMOUS_ID_MAX_AGE}; Path=/; SameSite=Lax`; }
