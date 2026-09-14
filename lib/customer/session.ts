import type { CustomerSession } from "./types";
import { getSupabaseServerAuthClient } from "@/lib/supabase/auth";

// Authentication is intentionally not inferred from query strings, cookies,
// or order IDs until an approved identity provider is connected.
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const client = await getSupabaseServerAuthClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return !error && data.user ? { customer: { id: data.user.id } } : null;
}
