import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSafeAuthReturnPath, SUPABASE_AUTH_CALLBACK_PATH } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; next?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const next = typeof body?.next === "string" && isSafeAuthReturnPath(body.next) ? body.next : "/pokopia/funnel/daily-reset";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Passwordless sign-in is not configured yet." }, { status: 503 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  // @supabase/ssr uses PKCE for magic links. Keep its verifier cookie in this
  // browser so the callback can exchange the returned code for a session.
  const initialCookies = request.headers.get("cookie")?.split(/;\s*/).filter(Boolean).map((raw) => {
    const [name, ...value] = raw.split("=");
    return { name, value: value.join("=") };
  }) ?? [];
  const response = NextResponse.json({ sent: true });
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => initialCookies,
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const origin = new URL(request.url).origin;
  const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}${SUPABASE_AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}` } });
  return error ? NextResponse.json({ error: "We could not send your sign-in link." }, { status: 502 }) : response;
}
