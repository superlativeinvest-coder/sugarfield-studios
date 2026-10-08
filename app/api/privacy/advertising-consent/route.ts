import {
  createAdvertisingConsentSnapshot,
  serializeAdvertisingConsentCookie,
  type AdvertisingConsentDecision,
} from "@/lib/privacy/advertising-consent-server";

const allowedKeys = new Set(["decision"]);

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ ok: false, error: "Consent request must be an object." }, { status: 400 });
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.has(key)) || (record.decision !== "granted" && record.decision !== "denied")) {
    return Response.json({ ok: false, error: "Consent decision must be granted or denied." }, { status: 400 });
  }
  if (!process.env.SUGARFIELD_CONSENT_SIGNING_SECRET) return Response.json({ ok: false, error: "Consent bridge is unavailable." }, { status: 503 });

  const snapshot = createAdvertisingConsentSnapshot(record.decision as AdvertisingConsentDecision);
  const secure = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
  const cookie = serializeAdvertisingConsentCookie(snapshot, secure);
  if (!cookie) return Response.json({ ok: false, error: "Consent bridge is unavailable." }, { status: 503 });
  const response = Response.json({ ok: true, decision: snapshot.decision, policyVersion: snapshot.policyVersion });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
