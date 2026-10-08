/**
 * Server-only TikTok Events API transport.
 *
 * This module intentionally accepts only an already-authoritative Purchase
 * event. It must not be imported by client components or browser bundles.
 */
if (typeof window !== "undefined") {
  throw new Error("TikTok Events API transport is server-only.");
}

export const TIKTOK_EVENTS_API_ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
export const TIKTOK_PURCHASE_EVENT_NAME = "Purchase" as const;

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 100;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const ALLOWED_EVENT_KEYS = new Set(["eventId", "orderId", "occurredAt", "currency", "valueCents", "contents"]);

export type TikTokPurchaseContent = {
  contentId: string;
  contentName: string;
  quantity: number;
  priceCents: number;
};

export type TikTokPurchaseEvent = {
  eventId: string;
  orderId: string;
  occurredAt: Date;
  currency: string;
  valueCents: number;
  contents: TikTokPurchaseContent[];
};

export type TikTokSendResult =
  | { status: "sent"; eventId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

type TikTokPurchasePayload = {
  event_source: "web";
  event_source_id: string;
  data: Array<{
    event: "Purchase";
    event_id: string;
    event_time: number;
    properties: {
      currency: string;
      value: number;
      content_type: "product";
      contents: Array<{
        content_id: string;
        content_name: string;
        quantity: number;
        price: number;
      }>;
    };
  }>;
};

type TikTokTransportOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
};

class TikTokTimeoutError extends Error {
  constructor() {
    super("TikTok Events API request timed out.");
    this.name = "TikTokTimeoutError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isFiniteSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function configurationError(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return "missing_configuration";
  if (/[^\x20-\x7e]/.test(value)) return "invalid_configuration";
  return undefined;
}

function validatePurchaseEvent(event: TikTokPurchaseEvent): string | undefined {
  if (!isRecord(event)) return "invalid_event";
  const unexpectedKey = Object.keys(event).find((key) => !ALLOWED_EVENT_KEYS.has(key));
  if (unexpectedKey) return "unsupported_event_or_field";
  if (typeof event.eventId !== "string" || !UUID_V4_PATTERN.test(event.eventId)) return "invalid_event_id";
  if (typeof event.orderId !== "string" || event.orderId.trim().length === 0 || event.orderId.length > 200) return "invalid_order_id";
  if (!(event.occurredAt instanceof Date) || Number.isNaN(event.occurredAt.getTime())) return "invalid_timestamp";
  if (typeof event.currency !== "string" || !CURRENCY_PATTERN.test(event.currency)) return "invalid_currency";
  if (!isFiniteSafeInteger(event.valueCents) || event.valueCents < 0) return "invalid_value";
  if (!Array.isArray(event.contents) || event.contents.length === 0) return "invalid_contents";

  for (const content of event.contents) {
    if (!isRecord(content)) return "invalid_contents";
    const contentKeys = Object.keys(content);
    if (contentKeys.some((key) => !["contentId", "contentName", "quantity", "priceCents"].includes(key))) return "invalid_contents";
    if (typeof content.contentId !== "string" || content.contentId.trim().length === 0 || content.contentId.length > 200) return "invalid_content_id";
    if (typeof content.contentName !== "string" || content.contentName.trim().length === 0 || content.contentName.length > 500) return "invalid_content_name";
    if (!isFiniteSafeInteger(content.quantity) || content.quantity <= 0) return "invalid_quantity";
    if (!isFiniteSafeInteger(content.priceCents) || content.priceCents < 0) return "invalid_price";
  }

  return undefined;
}

function readConfiguration(): { accessToken?: string; pixelId?: string; error?: string } {
  const accessToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const tokenError = configurationError(accessToken);
  const pixelError = configurationError(pixelId);
  if (tokenError === "missing_configuration" || pixelError === "missing_configuration") return { error: "missing_configuration" };
  if (tokenError || pixelError) return { error: "invalid_configuration" };
  return { accessToken, pixelId };
}

function centsToMajorUnits(cents: number): number {
  return cents / 100;
}

function buildPurchasePayload(event: TikTokPurchaseEvent, pixelId: string): TikTokPurchasePayload {
  return {
    event_source: "web",
    event_source_id: pixelId,
    data: [{
      event: TIKTOK_PURCHASE_EVENT_NAME,
      event_id: event.eventId,
      event_time: Math.floor(event.occurredAt.getTime() / 1000),
      properties: {
        currency: event.currency,
        value: centsToMajorUnits(event.valueCents),
        content_type: "product",
        contents: event.contents.map((content) => ({
          content_id: content.contentId,
          content_name: content.contentName,
          quantity: content.quantity,
          price: centsToMajorUnits(content.priceCents),
        })),
      },
    }],
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof TikTokTimeoutError || (error instanceof Error && error.name === "AbortError");
}

function classifyStatus(status: number): "success" | "retryable" | "auth" | "failed" {
  if (status >= 200 && status < 300) return "success";
  if (status === 401 || status === 403) return "auth";
  if (status === 429 || status >= 500) return "retryable";
  return "failed";
}

async function requestWithTimeout(
  fetchImpl: typeof fetch,
  payload: TikTokPurchasePayload,
  accessToken: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = fetchImpl(TIKTOK_EVENTS_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TikTokTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function logFailure(event: unknown, attempt: number, category: string, status?: number): void {
  const eventRecord = isRecord(event) ? event : {};
  const eventId = typeof eventRecord.eventId === "string" ? eventRecord.eventId : undefined;
  const orderId = typeof eventRecord.orderId === "string" ? eventRecord.orderId : undefined;
  console.error("[tiktok-events-api] delivery failed", {
    ...(eventId === undefined ? {} : { eventId }),
    ...(orderId === undefined ? {} : { orderId }),
    attempt,
    category,
    ...(status === undefined ? {} : { status }),
  });
}

/**
 * Sends one already-authoritative Purchase event to TikTok.
 *
 * The optional second argument exists only to make timeout/retry behavior
 * deterministic in tests; production callers use the default fetch, timeout,
 * retry count, and delay.
 */
export async function sendTikTokEvent(event: TikTokPurchaseEvent, options: TikTokTransportOptions = {}): Promise<TikTokSendResult> {
  const configuration = readConfiguration();
  if (configuration.error) {
    if (configuration.error === "invalid_configuration") console.error("[tiktok-events-api] invalid server configuration", { category: configuration.error });
    return { status: "skipped", reason: configuration.error };
  }

  const validationError = validatePurchaseEvent(event);
  if (validationError) {
    logFailure(event, 0, validationError);
    return { status: "failed", reason: validationError };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return { status: "skipped", reason: "fetch_unavailable" };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, Math.min(DEFAULT_MAX_ATTEMPTS, Math.floor(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)));
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const sleep = options.sleep ?? defaultSleep;
  const payload = buildPurchasePayload(event, configuration.pixelId as string);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestWithTimeout(fetchImpl, payload, configuration.accessToken as string, timeoutMs);
      const classification = classifyStatus(response.status);
      if (classification === "success") return { status: "sent", eventId: event.eventId };
      if (classification === "auth") {
        logFailure(event, attempt, "authentication_failure", response.status);
        return { status: "failed", reason: "authentication_failure" };
      }
      if (classification === "retryable") {
        logFailure(event, attempt, response.status === 429 ? "rate_limited" : "http_5xx", response.status);
        if (attempt < maxAttempts) {
          await sleep(retryDelayMs * attempt);
          continue;
        }
        return { status: "failed", reason: response.status === 429 ? "rate_limited" : "http_5xx" };
      }
      logFailure(event, attempt, "http_4xx", response.status);
      return { status: "failed", reason: "http_4xx" };
    } catch (error) {
      const category = isTimeoutError(error) ? "timeout" : "network_error";
      logFailure(event, attempt, category);
      if (attempt < maxAttempts) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      return { status: "failed", reason: category };
    }
  }

  return { status: "failed", reason: "retry_exhausted" };
}
