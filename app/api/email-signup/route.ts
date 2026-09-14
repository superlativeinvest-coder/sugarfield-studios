import { getEmailProvider } from "@/lib/email/provider";
import { validateEmailSignup } from "@/lib/email/validation";
import { cookies } from "next/headers";
import { createAccessToken, getQuickStartAccessRepository, hashAccessToken, QUICK_START_ACCESS_COOKIE, QUICK_START_ACCESS_MAX_AGE } from "@/lib/quick-start/access";
import { QUICK_START_PRODUCT_ID, QUICK_START_SKU } from "@/lib/quick-start/manifest";

function readString(value: unknown, max = 120): string | undefined { return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined; }
function readAttribution(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) { const clean = readString(raw); if (clean) result[key.slice(0, 40)] = clean; }
  return Object.keys(result).length ? result : undefined;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON request." }, { status: 400 }); }
  const signup = validateEmailSignup(body);
  if (!signup) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  const payload = body as Record<string, unknown>;
  const quickStartRequested = payload.productId === QUICK_START_PRODUCT_ID;
  const provider = getEmailProvider();
  if (quickStartRequested) {
    if (provider) {
      try { await provider.subscribe(signup.email); } catch { return Response.json({ error: "We could not complete signup right now." }, { status: 502 }); }
    }
    const repository = getQuickStartAccessRepository();
    if (!repository) return Response.json({ error: "Free product access storage is not configured yet." }, { status: 503 });
    const token = createAccessToken();
    const now = new Date().toISOString();
    try {
      await repository.upsert({ email: signup.email, productId: QUICK_START_PRODUCT_ID, sku: QUICK_START_SKU, funnelSession: readString(payload.funnelSession), firstTouchAttribution: readAttribution(payload.firstTouchAttribution), currentTouchAttribution: readAttribution(payload.currentTouchAttribution), accessGrantedAt: now, tokenHash: hashAccessToken(token) });
      const cookieStore = await cookies();
      cookieStore.set(QUICK_START_ACCESS_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: QUICK_START_ACCESS_MAX_AGE });
      return Response.json({ subscribed: true, accessGranted: true, productId: QUICK_START_PRODUCT_ID, emailDeliveryConfigured: Boolean(provider) });
    } catch { return Response.json({ error: "We could not prepare secure access right now." }, { status: 503 }); }
  }
  if (!provider) return Response.json({ error: "Email signup is not connected yet." }, { status: 503 });
  try { await provider.subscribe(signup.email); return Response.json({ subscribed: true }); } catch { return Response.json({ error: "We could not complete signup right now." }, { status: 502 }); }
}
