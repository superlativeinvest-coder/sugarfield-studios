import type { LibraryRepository } from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CustomerOrderRow = {
  id: string;
  created_at: string;
  entitlements: { productId: string; grantedAt: string }[] | null;
};

class SupabaseLibraryRepository implements LibraryRepository {
  async listForCustomer(customerId: string) {
    const client = getSupabaseServerClient();
    if (!client) return [];
    const { data, error } = await client.from("orders").select("id, created_at, entitlements").eq("customer_id", customerId).eq("status", "paid").order("created_at", { ascending: false });
    if (error) throw new Error(`Could not read customer library: ${error.message}`);
    return (data as CustomerOrderRow[] | null ?? []).flatMap((order) => (order.entitlements ?? []).map((entitlement) => ({ productId: entitlement.productId, orderId: order.id, grantedAt: entitlement.grantedAt || order.created_at })));
  }
}

export function getLibraryRepository(): LibraryRepository | null {
  return getSupabaseServerClient() ? new SupabaseLibraryRepository() : null;
}
