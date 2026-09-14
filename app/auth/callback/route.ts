import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSafeAuthReturnPath } from "@/lib/supabase/auth";
import { getPokopiaJourney, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code");
  const next = isSafeAuthReturnPath(url.searchParams.get("next")) ? url.searchParams.get("next")! : "/pokopia/funnel/start";
  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !anonKey) return NextResponse.redirect(new URL("/pokopia/funnel/start?auth=unavailable", url.origin));
  const initialCookies = request.headers.get("cookie")?.split(/;\s*/).filter(Boolean).map((raw) => { const [name, ...value] = raw.split("="); return { name, value: value.join("=") }; }) ?? [];
  const client = createServerClient(supabaseUrl, anonKey, { cookies: { getAll: () => initialCookies, setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  const { error } = await client.auth.exchangeCodeForSession(code); const { data } = await client.auth.getUser();
  if (error || !data.user) return NextResponse.redirect(new URL("/pokopia/funnel/start?auth=invalid", url.origin));
  const journeyId = request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1];
  if (journeyId) { const journey = await getPokopiaJourney(journeyId); if (journey) await updatePokopiaJourney(journeyId, { ...journey, customerId: data.user.id }); }
  return response;
}
