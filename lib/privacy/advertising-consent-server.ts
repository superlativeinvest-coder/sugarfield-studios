import { createHmac, timingSafeEqual } from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error("Advertising consent signing is server-only.");
}

export const ADVERTISING_CONSENT_COOKIE = "sf_advertising_consent";
export const ADVERTISING_CONSENT_POLICY_VERSION = "v1";
export const ADVERTISING_CONSENT_SOURCE = "sugarfield_consent_bridge";
export const ADVERTISING_CONSENT_VALIDITY_SECONDS = 180 * 24 * 60 * 60;

export type AdvertisingConsentDecision = "granted" | "denied";

export type AdvertisingConsentSnapshot = {
  decision: AdvertisingConsentDecision;
  policyVersion: typeof ADVERTISING_CONSENT_POLICY_VERSION;
  capturedAt: string;
  expiresAt: string;
  source: typeof ADVERTISING_CONSENT_SOURCE;
};

export type AdvertisingConsentMetadata = Record<string, string>;

const CONSENT_METADATA_KEYS = {
  eligible: "advertising_consent_eligible",
  policyVersion: "advertising_consent_policy_version",
  capturedAt: "advertising_consent_captured_at",
  expiresAt: "advertising_consent_expires_at",
  source: "advertising_consent_source",
  signature: "advertising_consent_signature",
} as const;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | undefined {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

function secret(): string | undefined {
  const value = process.env.SUGARFIELD_CONSENT_SIGNING_SECRET;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function canonicalSnapshot(snapshot: AdvertisingConsentSnapshot): string {
  return JSON.stringify({
    decision: snapshot.decision,
    policyVersion: snapshot.policyVersion,
    capturedAt: snapshot.capturedAt,
    expiresAt: snapshot.expiresAt,
    source: snapshot.source,
  });
}

function signatureForPayload(payload: string, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(payload, "utf8").digest("hex");
}

function validIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validSnapshotShape(value: unknown): value is AdvertisingConsentSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort().join(",");
  const expectedKeys = ["capturedAt", "decision", "expiresAt", "policyVersion", "source"].sort().join(",");
  return keys === expectedKeys
    && (candidate.decision === "granted" || candidate.decision === "denied")
    && candidate.policyVersion === ADVERTISING_CONSENT_POLICY_VERSION
    && candidate.source === ADVERTISING_CONSENT_SOURCE
    && validIsoTimestamp(candidate.capturedAt)
    && validIsoTimestamp(candidate.expiresAt)
    && Date.parse(candidate.expiresAt) > Date.parse(candidate.capturedAt);
}

export function createAdvertisingConsentSnapshot(decision: AdvertisingConsentDecision, now = new Date()): AdvertisingConsentSnapshot {
  const capturedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ADVERTISING_CONSENT_VALIDITY_SECONDS * 1000).toISOString();
  return { decision, policyVersion: ADVERTISING_CONSENT_POLICY_VERSION, capturedAt, expiresAt, source: ADVERTISING_CONSENT_SOURCE };
}

export function signAdvertisingConsentSnapshot(snapshot: AdvertisingConsentSnapshot, signingSecret = secret()): string | undefined {
  if (!signingSecret || !validSnapshotShape(snapshot)) return undefined;
  const encoded = base64UrlEncode(canonicalSnapshot(snapshot));
  return `${encoded}.${signatureForPayload(encoded, signingSecret)}`;
}

export function verifyAdvertisingConsentCookie(value: string | undefined, signingSecret = secret(), now = new Date()): AdvertisingConsentSnapshot | undefined {
  if (!value || !signingSecret) return undefined;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[0-9a-f]{64}$/i.test(parts[1])) return undefined;
  const payload = base64UrlDecode(parts[0]);
  if (!payload) return undefined;
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return undefined; }
  if (!validSnapshotShape(parsed)) return undefined;
  const expected = signatureForPayload(parts[0], signingSecret);
  const suppliedBuffer = Buffer.from(parts[1], "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return undefined;
  const capturedAt = Date.parse(parsed.capturedAt);
  const expiresAt = Date.parse(parsed.expiresAt);
  const nowMs = now.getTime();
  if (expiresAt <= nowMs || capturedAt > nowMs + 5 * 60 * 1000) return undefined;
  return parsed;
}

function cookieValueFromHeader(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${ADVERTISING_CONSENT_COOKIE}=`));
  return match?.slice(`${ADVERTISING_CONSENT_COOKIE}=`.length);
}

export function readAdvertisingConsentFromRequest(request: Request, now = new Date()): AdvertisingConsentSnapshot | undefined {
  return verifyAdvertisingConsentCookie(cookieValueFromHeader(request.headers.get("cookie")), secret(), now);
}

export function consentMetadataForRequest(request: Request, now = new Date()): AdvertisingConsentMetadata {
  const snapshot = readAdvertisingConsentFromRequest(request, now);
  return {
    [CONSENT_METADATA_KEYS.eligible]: snapshot?.decision ?? "unknown",
    [CONSENT_METADATA_KEYS.policyVersion]: snapshot?.policyVersion ?? "unknown",
    [CONSENT_METADATA_KEYS.capturedAt]: snapshot?.capturedAt ?? "unknown",
    [CONSENT_METADATA_KEYS.expiresAt]: snapshot?.expiresAt ?? "unknown",
    [CONSENT_METADATA_KEYS.source]: ADVERTISING_CONSENT_SOURCE,
    ...(snapshot && signAdvertisingConsentSnapshot(snapshot) ? { [CONSENT_METADATA_KEYS.signature]: signAdvertisingConsentSnapshot(snapshot)! } : {}),
  };
}

export function verifyAdvertisingConsentMetadata(metadata: Record<string, string | undefined>, now = new Date()): AdvertisingConsentSnapshot | undefined {
  if (metadata[CONSENT_METADATA_KEYS.eligible] !== "granted") return undefined;
  if (metadata[CONSENT_METADATA_KEYS.policyVersion] !== ADVERTISING_CONSENT_POLICY_VERSION) return undefined;
  if (metadata[CONSENT_METADATA_KEYS.source] !== ADVERTISING_CONSENT_SOURCE) return undefined;
  const capturedAt = metadata[CONSENT_METADATA_KEYS.capturedAt];
  const expiresAt = metadata[CONSENT_METADATA_KEYS.expiresAt];
  const signature = metadata[CONSENT_METADATA_KEYS.signature];
  if (!capturedAt || !expiresAt || !signature) return undefined;
  const snapshot: AdvertisingConsentSnapshot = {
    decision: "granted",
    policyVersion: ADVERTISING_CONSENT_POLICY_VERSION,
    capturedAt,
    expiresAt,
    source: ADVERTISING_CONSENT_SOURCE,
  };
  const expectedSignature = signAdvertisingConsentSnapshot(snapshot);
  if (!expectedSignature || expectedSignature !== signature) return undefined;
  return verifyAdvertisingConsentCookie(signature, secret(), now);
}

export function serializeAdvertisingConsentCookie(snapshot: AdvertisingConsentSnapshot, secure: boolean, signingSecret = secret()): string | undefined {
  const value = signAdvertisingConsentSnapshot(snapshot, signingSecret);
  if (!value) return undefined;
  return `${ADVERTISING_CONSENT_COOKIE}=${value}; Max-Age=${ADVERTISING_CONSENT_VALIDITY_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export { CONSENT_METADATA_KEYS };
