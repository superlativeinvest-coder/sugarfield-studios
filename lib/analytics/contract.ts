import type { AttributionState } from "@/lib/attribution/types";
import { isBrowserPersistedAnalyticsEventName, type CanonicalAnalyticsEventName } from "./taxonomy";

export type AnalyticsMetadata = Record<string, string | number | boolean | null>;

export type TrackFunnelEventInput = {
  eventName: Exclude<CanonicalAnalyticsEventName, "purchase_completed">;
  eventId?: string;
  occurredAt?: string;
  journeyId?: string;
  anonymousId?: string;
  sessionId?: string;
  funnelStep?: string;
  previousStep?: string;
  productId?: string;
  productPriceCents?: number;
  selectedProducts?: string[];
  cartValueCents?: number;
  pagePath?: string;
  landingPage?: string;
  referrer?: string;
  attribution?: AttributionState | null;
  metadata?: AnalyticsMetadata;
};

export type AnalyticsClientPayload = TrackFunnelEventInput & { eventName: CanonicalAnalyticsEventName };

export type ValidatedAnalyticsClientPayload = TrackFunnelEventInput & { eventName: Exclude<CanonicalAnalyticsEventName, "purchase_completed">; eventId: string };

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys = new Set([
  "eventName", "eventId", "occurredAt", "journeyId", "anonymousId", "sessionId", "funnelStep", "previousStep",
  "productId", "productPriceCents", "selectedProducts", "cartValueCents", "pagePath", "landingPage", "referrer",
  "attribution", "metadata",
]);
const protectedKeys = new Set(["userId", "user_id", "orderId", "order_id", "revenue", "revenueCents", "revenue_cents", "currency", "createdAt", "created_at", "receivedAt", "received_at"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validOptionalString(value: unknown, max: number): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.trim().length > 0 && value.length <= max);
}

function validOptionalUuid(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && uuidV4Pattern.test(value));
}

function validOptionalMoney(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_000_000_000);
}

function validMetadata(value: unknown): value is AnalyticsMetadata | undefined {
  if (value === undefined) return true;
  if (!isRecord(value) || Object.keys(value).length > 20) return false;
  return Object.entries(value).every(([key, item]) => key.length <= 80 && /^[a-zA-Z0-9_.-]+$/.test(key) && (item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") && (typeof item !== "string" || item.length <= 500));
}

export function validateAnalyticsClientPayload(input: unknown): { ok: true; value: ValidatedAnalyticsClientPayload } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "Analytics payload must be an object." };
  const keys = Object.keys(input);
  const protectedKey = keys.find((key) => protectedKeys.has(key));
  if (protectedKey) return { ok: false, error: `Protected analytics field is not client-writable: ${protectedKey}.` };
  const unsupportedKey = keys.find((key) => !allowedKeys.has(key));
  if (unsupportedKey) return { ok: false, error: `Unsupported analytics field: ${unsupportedKey}.` };
  if (!isBrowserPersistedAnalyticsEventName(input.eventName)) return { ok: false, error: "Unsupported or server-only analytics event name." };
  if (input.eventId !== undefined && (!uuidV4Pattern.test(String(input.eventId)))) return { ok: false, error: "eventId must be a UUIDv4." };
  if (!validOptionalString(input.occurredAt, 40) || (input.occurredAt !== undefined && Number.isNaN(Date.parse(input.occurredAt)))) return { ok: false, error: "occurredAt must be a valid timestamp." };
  for (const [key, max] of [["journeyId", 80], ["anonymousId", 80], ["sessionId", 160], ["funnelStep", 80], ["previousStep", 80], ["productId", 120], ["pagePath", 2048], ["landingPage", 2048], ["referrer", 2048]] as const) {
    if (!validOptionalString(input[key], max)) return { ok: false, error: `${key} is invalid.` };
  }
  if (!validOptionalUuid(input.journeyId) || !validOptionalUuid(input.anonymousId)) return { ok: false, error: "journeyId and anonymousId must be UUIDv4 values." };
  if (!validOptionalMoney(input.productPriceCents) || !validOptionalMoney(input.cartValueCents)) return { ok: false, error: "Monetary fields must be nonnegative integer cents." };
  if (input.selectedProducts !== undefined && (!Array.isArray(input.selectedProducts) || input.selectedProducts.length > 50 || input.selectedProducts.some((item) => typeof item !== "string" || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(item)))) return { ok: false, error: "selectedProducts is invalid." };
  if (input.attribution !== undefined && input.attribution !== null && !isRecord(input.attribution)) return { ok: false, error: "attribution must be an object." };
  if (!validMetadata(input.metadata)) return { ok: false, error: "metadata is invalid." };
  return { ok: true, value: { ...input, eventName: input.eventName, eventId: input.eventId ?? crypto.randomUUID() } as ValidatedAnalyticsClientPayload };
}
