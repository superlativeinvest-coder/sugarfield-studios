import { pokopiaFunnelOffers } from "@/data/pokopia-funnel";
import type { TrackFunnelEventInput } from "@/lib/analytics/contract";
import type { CanonicalAnalyticsEventName } from "@/lib/analytics/taxonomy";
import { hasAdvertisingConsent } from "@/lib/privacy/consent";

export type TikTokPixelEnvironment = "local" | "staging" | "preview" | "production";

export type TikTokPixelStatus = "loading" | "ready" | "failed";

export interface TikTokQueue extends Array<unknown> {
  methods?: readonly string[];
  setAndDefer?: (target: TikTokQueue, method: string) => void;
  instance?: (pixelId: string) => TikTokQueue;
  _i?: Record<string, TikTokQueue>;
  _t?: Record<string, number>;
  _o?: Record<string, Record<string, unknown>>;
  load: (pixelId: string, options?: Record<string, unknown>) => void;
  page: (...args: unknown[]) => void;
  track?: (...args: unknown[]) => void;
  disableCookie?: (...args: unknown[]) => void;
}

export interface TikTokPixelWindowState {
  pixelId: string;
  status: TikTokPixelStatus;
  loadCalled: boolean;
  pageCalled: boolean;
  dispatchedEventIds?: string[];
}

export interface TikTokPixelConfig {
  pixelId?: string;
  enabled: boolean;
  environment: TikTokPixelEnvironment;
  productionBlocked: boolean;
  requiresAdvertisingConsent: boolean;
}

export interface TikTokPixelEnvironmentSource {
  NEXT_PUBLIC_TIKTOK_PIXEL_ID?: string;
  NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED?: string;
  NEXT_PUBLIC_TIKTOK_PIXEL_ENV?: string;
  NODE_ENV?: string;
}

export interface TikTokPixelInitializationResult {
  status: "disabled" | "initialized" | "already_initialized" | "failed";
  reason?: "server" | "missing_pixel_id" | "disabled" | "production_blocked" | "consent_required" | "load_failed";
}

export type TikTokStandardEventName = "ViewContent" | "SubmitForm" | "AddToCart" | "InitiateCheckout";

export type TikTokProductContent = {
  content_id: string;
  content_name: string;
  quantity: number;
  price: number;
};

export type TikTokEventProperties = {
  contents?: TikTokProductContent[];
  content_type?: "product";
  currency?: string;
  value?: number;
};

export type TikTokMappedEvent = {
  eventName: TikTokStandardEventName;
  properties: TikTokEventProperties;
};

export type TikTokDispatchResult = "dispatched" | "deduplicated" | "not_mapped" | "disabled" | "unavailable" | "failed";

const TIKTOK_SCRIPT_URL = "https://analytics.tiktok.com/i18n/pixel/events.js";
const TIKTOK_OBJECT_NAME = "ttq";
const TIKTOK_SCRIPT_ATTRIBUTE = "data-sugarfield-tiktok-pixel";
const TIKTOK_METHODS = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"] as const;

const productOffers = {
  P06: pokopiaFunnelOffers.dailyReset,
  P16: pokopiaFunnelOffers.companion,
  P18: pokopiaFunnelOffers.completePlayerSystem,
  P17: pokopiaFunnelOffers.completionistKit,
} as const;

const eventProductIds: Partial<Record<CanonicalAnalyticsEventName, keyof typeof productOffers>> = {
  p06_viewed: "P06",
  p16_viewed: "P16",
  p18_viewed: "P18",
  p17_viewed: "P17",
  p06_buy_clicked: "P06",
  p16_buy_clicked: "P16",
  p18_buy_clicked: "P18",
  p17_buy_clicked: "P17",
};

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: TikTokQueue;
    __sugarfieldTikTokPixel?: TikTokPixelWindowState;
  }
}

function parseEnvironment(value: string | undefined, nodeEnvironment: string | undefined): TikTokPixelEnvironment {
  if (value === "local" || value === "staging" || value === "preview" || value === "production") return value;
  return nodeEnvironment === "production" ? "production" : "local";
}

function getRuntimeTikTokPixelEnvironment(): TikTokPixelEnvironmentSource {
  // Keep these references statically named so Next.js inlines public values in
  // the browser bundle. Dynamic process.env object lookups are not inlined.
  return {
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
    NEXT_PUBLIC_TIKTOK_PIXEL_ENV: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };
}

export function getTikTokPixelConfig(source?: TikTokPixelEnvironmentSource): TikTokPixelConfig {
  const runtimeEnvironment = source ?? getRuntimeTikTokPixelEnvironment();
  const pixelId = runtimeEnvironment.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() || undefined;
  const environment = parseEnvironment(runtimeEnvironment.NEXT_PUBLIC_TIKTOK_PIXEL_ENV?.trim(), runtimeEnvironment.NODE_ENV);
  const requiresAdvertisingConsent = environment === "production";
  const productionBlocked = requiresAdvertisingConsent && runtimeEnvironment.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED !== "true";
  const enabled = runtimeEnvironment.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === "true" && Boolean(pixelId) && !productionBlocked;

  return { pixelId, enabled, environment, productionBlocked, requiresAdvertisingConsent };
}

function getScript(pixelId: string): HTMLScriptElement | undefined {
  if (typeof document === "undefined") return undefined;
  return Array.from(document.scripts).find((script) => script.getAttribute(TIKTOK_SCRIPT_ATTRIBUTE) === pixelId);
}

function createDeferredMethod(queue: TikTokQueue, method: string): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    queue.push([method, ...args]);
  };
}

function appendTikTokScript(pixelId: string, state: TikTokPixelWindowState): void {
  if (typeof document === "undefined" || getScript(pixelId)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `${TIKTOK_SCRIPT_URL}?sdkid=${encodeURIComponent(pixelId)}&lib=${TIKTOK_OBJECT_NAME}`;
  script.setAttribute(TIKTOK_SCRIPT_ATTRIBUTE, pixelId);
  script.onload = () => {
    state.status = "ready";
  };
  script.onerror = () => {
    state.status = "failed";
  };
  document.head.appendChild(script);
}

function createTikTokQueue(state: TikTokPixelWindowState): TikTokQueue {
  const queue = [] as unknown as TikTokQueue;
  queue.methods = TIKTOK_METHODS;
  queue.setAndDefer = (target, method) => {
    (target as unknown as Record<string, unknown>)[method] = createDeferredMethod(target, method);
  };
  for (const method of TIKTOK_METHODS) {
    queue.setAndDefer(queue, method);
  }
  queue.instance = (pixelId) => {
    queue._i = queue._i || {};
    const instance = queue._i[pixelId] || ([] as unknown as TikTokQueue);
    instance.methods = TIKTOK_METHODS;
    for (const method of TIKTOK_METHODS) queue.setAndDefer?.(instance, method);
    queue._i[pixelId] = instance;
    return instance;
  };
  queue.load = (pixelId: string, options) => {
    queue._i = queue._i || {};
    queue._i[pixelId] = queue._i[pixelId] || ([] as unknown as TikTokQueue);
    queue._i[pixelId].methods = TIKTOK_METHODS;
    queue._t = queue._t || {};
    queue._t[pixelId] = Date.now();
    queue._o = queue._o || {};
    queue._o[pixelId] = options || {};
    appendTikTokScript(pixelId, state);
  };
  return queue;
}

function getOrCreateQueue(state: TikTokPixelWindowState): TikTokQueue {
  window.TiktokAnalyticsObject = TIKTOK_OBJECT_NAME;
  if (window.ttq && typeof window.ttq.load === "function" && typeof window.ttq.page === "function") return window.ttq;
  const queue = createTikTokQueue(state);
  window.ttq = queue;
  return queue;
}

export function initializeTikTokPixel(config: TikTokPixelConfig = getTikTokPixelConfig()): TikTokPixelInitializationResult {
  if (typeof window === "undefined" || typeof document === "undefined") return { status: "disabled", reason: "server" };
  if (!config.pixelId) return { status: "disabled", reason: "missing_pixel_id" };
  if (config.productionBlocked) return { status: "disabled", reason: "production_blocked" };
  if (!config.enabled) return { status: "disabled", reason: "disabled" };
  if (config.requiresAdvertisingConsent && !hasAdvertisingConsent()) return { status: "disabled", reason: "consent_required" };

  const existingState = window.__sugarfieldTikTokPixel;
  if (existingState?.pixelId === config.pixelId && existingState.loadCalled) {
    return { status: "already_initialized" };
  }

  const state: TikTokPixelWindowState = existingState?.pixelId === config.pixelId
    ? existingState
    : { pixelId: config.pixelId, status: "loading", loadCalled: false, pageCalled: false };
  window.__sugarfieldTikTokPixel = state;

  try {
    const queue = getOrCreateQueue(state);
    if (!getScript(config.pixelId) && !state.loadCalled) {
      state.loadCalled = true;
      queue.load(config.pixelId);
    } else {
      state.loadCalled = true;
    }
    if (!state.pageCalled) {
      state.pageCalled = true;
      queue.page();
    }
    return { status: existingState?.pixelId === config.pixelId ? "already_initialized" : "initialized" };
  } catch (error) {
    state.status = "failed";
    if (process.env.NODE_ENV !== "production") console.debug("TikTok Pixel initialization failed open", error);
    return { status: "failed", reason: "load_failed" };
  }
}

export function getTikTokPixelScriptUrl(): string {
  return TIKTOK_SCRIPT_URL;
}

function productContent(productId: string, priceCents?: number): TikTokProductContent | undefined {
  if (!(productId in productOffers)) return undefined;
  const offer = productOffers[productId as keyof typeof productOffers];
  const configuredPriceCents = typeof offer.funnelPrice === "number" ? Math.round(offer.funnelPrice * 100) : undefined;
  const resolvedPriceCents = priceCents ?? configuredPriceCents;
  if (resolvedPriceCents === undefined) return undefined;
  return { content_id: productId, content_name: offer.title, quantity: 1, price: resolvedPriceCents / 100 };
}

function productIdsForEvent(eventName: CanonicalAnalyticsEventName, input: Pick<TrackFunnelEventInput, "productId" | "selectedProducts">): string[] {
  const selectedProducts = input.selectedProducts?.filter((productId) => productId in productOffers) ?? [];
  if (selectedProducts.length > 0) return [...new Set(selectedProducts)];
  const productId = input.productId ?? eventProductIds[eventName];
  return productId && productId in productOffers ? [productId] : [];
}

export function mapCanonicalEventToTikTok(eventName: CanonicalAnalyticsEventName, input: Pick<TrackFunnelEventInput, "productId" | "productPriceCents" | "selectedProducts" | "cartValueCents"> = {}): TikTokMappedEvent | undefined {
  const productIds = productIdsForEvent(eventName, input);
  const isProductView = eventName === "p06_viewed" || eventName === "p16_viewed" || eventName === "p18_viewed" || eventName === "p17_viewed";
  const isProductBuy = eventName === "p06_buy_clicked" || eventName === "p16_buy_clicked" || eventName === "p18_buy_clicked" || eventName === "p17_buy_clicked";

  if (eventName === "free_start_viewed") return { eventName: "ViewContent", properties: {} };
  if (eventName === "email_submitted") return { eventName: "SubmitForm", properties: {} };
  if (eventName === "checkout_started") {
    const contents = productIds.map((productId) => productContent(productId)).filter((content): content is TikTokProductContent => content !== undefined);
    const firstProduct = contents[0];
    return {
      eventName: "InitiateCheckout",
      properties: {
        ...(contents.length > 0 ? { contents, content_type: "product" as const } : {}),
        ...(firstProduct ? { currency: "USD" } : {}),
        ...(input.cartValueCents !== undefined ? { value: input.cartValueCents / 100 } : {}),
      },
    };
  }
  if (!isProductView && !isProductBuy) return undefined;

  const productId = productIds[0];
  if (!productId) return { eventName: isProductView ? "ViewContent" : "AddToCart", properties: {} };
  const content = productContent(productId, input.productPriceCents);
  if (!content) return { eventName: isProductView ? "ViewContent" : "AddToCart", properties: {} };
  return {
    eventName: isProductView ? "ViewContent" : "AddToCart",
    properties: {
      contents: [{ ...content, quantity: isProductBuy ? 1 : content.quantity }],
      content_type: "product",
      currency: "USD",
      value: content.price,
    },
  };
}

function rememberDispatchedEvent(state: TikTokPixelWindowState, eventId: string): boolean {
  state.dispatchedEventIds = state.dispatchedEventIds ?? [];
  if (state.dispatchedEventIds.includes(eventId)) return false;
  state.dispatchedEventIds.push(eventId);
  if (state.dispatchedEventIds.length > 250) state.dispatchedEventIds.splice(0, state.dispatchedEventIds.length - 250);
  return true;
}

export function dispatchTikTokEvent(input: TrackFunnelEventInput, eventId: string, config: TikTokPixelConfig = getTikTokPixelConfig()): TikTokDispatchResult {
  const mapped = mapCanonicalEventToTikTok(input.eventName, input);
  if (!mapped) return "not_mapped";
  if (!config.enabled || config.productionBlocked) return "disabled";
  if (typeof window === "undefined" || !window.ttq || typeof window.ttq.track !== "function") return "unavailable";
  if (config.requiresAdvertisingConsent && !hasAdvertisingConsent()) return "disabled";

  const state = window.__sugarfieldTikTokPixel;
  if (state && !rememberDispatchedEvent(state, eventId)) return "deduplicated";
  try {
    window.ttq.track(mapped.eventName, mapped.properties, { event_id: eventId });
    return "dispatched";
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.debug("TikTok Pixel event failed open", error);
    return "failed";
  }
}
