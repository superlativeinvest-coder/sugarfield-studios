import type { Order, OrderRepository, PaidOrderInput } from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type OrderRow = { id: string; provider: "stripe"; provider_session_id: string; provider_event_id: string | null; payment_intent_id: string | null; product_id: string; offer_id: string | null; source_order_id: string | null; sku: string | null; status: "paid"; amount_total: number | null; currency: string | null; customer_email: string | null; customer_id: string | null; funnel_id: string | null; funnel_step: string | null; funnel_session: string | null; first_touch_attribution: Record<string, string> | null; current_touch_attribution: Record<string, string> | null; fulfillment_status: "pending" | "fulfilled" | "failed"; entitlements: { productId: string; grantedAt: string; fulfillmentVersion?: string; stripePriceId?: string }[] | null; created_at: string };
function toOrder(row: OrderRow): Order { return { id: row.id, provider: row.provider, providerSessionId: row.provider_session_id, providerEventId: row.provider_event_id ?? undefined, paymentIntentId: row.payment_intent_id ?? undefined, productId: row.product_id, offerId: row.offer_id ?? undefined, sourceOrderId: row.source_order_id ?? undefined, sku: row.sku ?? undefined, status: row.status, amountTotal: row.amount_total ?? undefined, currency: row.currency ?? undefined, customerEmail: row.customer_email ?? undefined, customerId: row.customer_id ?? undefined, funnelId: row.funnel_id ?? undefined, funnelStep: row.funnel_step ?? undefined, funnelSession: row.funnel_session ?? undefined, firstTouchAttribution: row.first_touch_attribution ?? undefined, currentTouchAttribution: row.current_touch_attribution ?? undefined, fulfillmentStatus: row.fulfillment_status, entitlements: row.entitlements ?? [], createdAt: row.created_at }; }

class SupabaseOrderRepository implements OrderRepository {
  async findById(orderId: string): Promise<Order | null> {
    const client = getSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error) throw new Error(`Could not read order: ${error.message}`);
    return data ? toOrder(data as OrderRow) : null;
  }
  async findByProviderSessionId(providerSessionId: string): Promise<Order | null> {
    const client = getSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.from("orders").select("*").eq("provider_session_id", providerSessionId).maybeSingle();
    if (error) throw new Error(`Could not read order: ${error.message}`);
    return data ? toOrder(data as OrderRow) : null;
  }
  async findByFunnelSession(funnelSession: string): Promise<Order | null> {
    const client = getSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.from("orders").select("*").eq("funnel_session", funnelSession).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Could not read funnel order: ${error.message}`);
    return data ? toOrder(data as OrderRow) : null;
  }
  async updateFulfillmentStatus(orderId: string, status: "pending" | "fulfilled" | "failed"): Promise<Order | null> {
    const client = getSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.from("orders").update({ fulfillment_status: status }).eq("id", orderId).select("*").maybeSingle();
    if (error) throw new Error(`Could not update fulfillment: ${error.message}`);
    return data ? toOrder(data as OrderRow) : null;
  }
  async createPaidOrder(input: PaidOrderInput): Promise<Order> {
    const client = getSupabaseServerClient();
    if (!client) throw new Error("Supabase order storage is not configured.");
    const { data, error } = await client.from("orders").insert({ id: crypto.randomUUID(), provider: input.provider, provider_session_id: input.providerSessionId, provider_event_id: input.providerEventId ?? null, payment_intent_id: input.paymentIntentId ?? null, product_id: input.productId, offer_id: input.offerId ?? null, source_order_id: input.sourceOrderId ?? null, sku: input.sku ?? input.productId, status: "paid", amount_total: input.amountTotal ?? null, currency: input.currency ?? null, customer_email: input.customerEmail ?? null, customer_id: input.customerId ?? null, funnel_id: input.funnelId ?? null, funnel_step: input.funnelStep ?? null, funnel_session: input.funnelSession ?? null, first_touch_attribution: input.firstTouchAttribution ?? null, current_touch_attribution: input.currentTouchAttribution ?? null, fulfillment_status: input.fulfillmentStatus ?? "pending", entitlements: input.entitlements ?? [], created_at: input.createdAt }).select("*").single();
    if (!error && data) return toOrder(data as OrderRow);
    if (error?.code === "23505") { const existing = await this.findByProviderSessionId(input.providerSessionId); if (existing) return existing; }
    throw new Error(`Could not create order: ${error?.message ?? "No order returned."}`);
  }
}
export function getOrderRepository(): OrderRepository | null { return getSupabaseServerClient() ? new SupabaseOrderRepository() : null; }
