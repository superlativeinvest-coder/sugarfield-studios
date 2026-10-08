import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { classifySupabaseTarget } from "@/lib/supabase/environment";

loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const target = classifySupabaseTarget(url);
if (!url || !key || (target !== "STAGING" && target !== "PRODUCTION")) throw new Error("Schema verification requires an approved staging or production Supabase target.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const checks = [
  ["pokopia_funnel_journeys", "id,customer_id,selected_products,selected_tier,current_total_cents,current_step,journey_version,checkout_created,checkout_completed,stripe_checkout_session_id,checkout_amount_cents,checkout_fingerprint,checkout_fingerprint_version,p18_qualified_view,p18_skipped,p17_eligible,p17_purchased,updated_at"],
  ["orders", "id,provider,provider_session_id,provider_event_id,payment_intent_id,product_id,offer_id,source_order_id,sku,status,amount_total,currency,customer_id,fulfillment_status,line_items,entitlements,created_at"],
] as const;

for (const [table, columns] of checks) {
  const columnSelection: string = columns;
  const { error } = await client.from(table).select(columnSelection).limit(0);
  if (error) throw new Error(`Schema drift detected in ${table}: ${error.message}`);
}
console.log(JSON.stringify({ target, status: "verified", tables: checks.map(([table]) => table) }));
