import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_AUTH_CALLBACK_PATH = "/auth/callback";
function config() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return url && key ? { url, key } : null; }
export function getSupabaseBrowserClient() { const value = config(); return value ? createBrowserClient(value.url, value.key) : null; }
export async function getSupabaseServerAuthClient() {
  const value = config(); if (!value) return null;
  const store = await cookies();
  return createServerClient(value.url, value.key, { cookies: { getAll: () => store.getAll(), setAll: (items) => { try { items.forEach(({ name, value: cookieValue, options }) => store.set(name, cookieValue, options)); } catch { /* server render is read-only */ } } } });
}
export function isSafeAuthReturnPath(value: string | null | undefined): value is string { return Boolean(value && value.startsWith("/pokopia/funnel/") && !value.startsWith("//")); }
