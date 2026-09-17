import { cookies } from "next/headers";
import { getSupabaseServerAuthClient } from "@/lib/supabase/auth";
import { getEmailProvider } from "@/lib/email/provider";
import { createAccessToken, getQuickStartAccessRepository, hashAccessToken, QUICK_START_ACCESS_COOKIE, QUICK_START_ACCESS_MAX_AGE } from "@/lib/quick-start/access";
import { QUICK_START_PRODUCT_ID, QUICK_START_SKU } from "@/lib/quick-start/manifest";

function readString(value: unknown, max = 120): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function readAttribution(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const clean = readString(raw);
    if (clean) result[key.slice(0, 40)] = clean;
  }
  return Object.keys(result).length ? result : undefined;
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(QUICK_START_ACCESS_COOKIE)?.value;
  if (!token) return Response.json({ accessGranted: false });

  const repository = getQuickStartAccessRepository();
  if (!repository) return Response.json({ error: "Free product access storage is not configured yet." }, { status: 503 });

  try {
    const access = await repository.findByTokenHash(hashAccessToken(token));
    return Response.json({ accessGranted: Boolean(access) });
  } catch {
    return Response.json({ error: "We could not restore secure access right now." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getSupabaseServerAuthClient();
  if (!auth) return Response.json({ error: "Passwordless sign-in is not configured yet." }, { status: 503 });

  const { data, error } = await auth.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !email) return Response.json({ error: "Sign in to get your Quick Start Pack." }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const provider = getEmailProvider();
  if (provider) {
    try { await provider.subscribe(email); } catch { return Response.json({ error: "We could not complete signup right now." }, { status: 502 }); }
  }

  const repository = getQuickStartAccessRepository();
  if (!repository) return Response.json({ error: "Free product access storage is not configured yet." }, { status: 503 });

  const token = createAccessToken();
  try {
    await repository.upsert({
      email,
      productId: QUICK_START_PRODUCT_ID,
      sku: QUICK_START_SKU,
      funnelSession: readString(body?.funnelSession),
      firstTouchAttribution: readAttribution(body?.firstTouchAttribution),
      currentTouchAttribution: readAttribution(body?.currentTouchAttribution),
      accessGrantedAt: new Date().toISOString(),
      tokenHash: hashAccessToken(token),
    });
    const cookieStore = await cookies();
    cookieStore.set(QUICK_START_ACCESS_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: QUICK_START_ACCESS_MAX_AGE });
    return Response.json({ accessGranted: true, productId: QUICK_START_PRODUCT_ID });
  } catch {
    return Response.json({ error: "We could not prepare secure access right now." }, { status: 503 });
  }
}
