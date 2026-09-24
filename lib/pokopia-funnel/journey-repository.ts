import { emptyPokopiaJourney, type PokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { getSelectedTotalCents, normalizeSelectedProducts } from "@/lib/pokopia-funnel/cumulative";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type JourneyRow = Record<string, unknown> & { id: string };
const booleanColumns = {
  quickStartClaimed: "quick_start_claimed", dailyResetViewed: "daily_reset_viewed", dailyResetPurchased: "daily_reset_purchased", dailyResetSkipped: "daily_reset_skipped",
  companionViewed: "companion_viewed", companionPurchased: "companion_purchased", companionSkipped: "companion_skipped",
  p18Eligible: "p18_eligible", p18QualifiedView: "p18_qualified_view", p18Bypassed: "p18_bypassed", p18Viewed: "p18_viewed", p18Purchased: "p18_purchased", p18Skipped: "p18_skipped",
  p17Eligible: "p17_eligible", p17DownsellViewed: "p17_downsell_viewed", p17Purchased: "p17_purchased", p17Skipped: "p17_skipped", dailyResetAccepted: "daily_reset_accepted", companionAccepted: "companion_accepted", p18Accepted: "p18_accepted", p17Accepted: "p17_accepted", checkoutCreated: "checkout_created", checkoutCompleted: "checkout_completed", journeyCompleted: "journey_completed",
} as const;

function asRecord(value: unknown): Record<string, string> | undefined { return value && typeof value === "object" ? value as Record<string, string> : undefined; }
function asDeliveryStatus(value: unknown): PokopiaJourney["quickStartDeliveryStatus"] { return value === "queued" || value === "sent" || value === "failed" || value === "not_configured" ? value : "pending"; }
function fromRow(row: JourneyRow): PokopiaJourney {
  const journey = emptyPokopiaJourney(row.id);
  for (const [key, column] of Object.entries(booleanColumns) as [keyof typeof booleanColumns, (typeof booleanColumns)[keyof typeof booleanColumns]][]) journey[key] = row[column] === true;
  const selectedProducts = normalizeSelectedProducts(Array.isArray(row.selected_products) ? row.selected_products : []);
  return { ...journey, leadEmail: typeof row.lead_email === "string" ? row.lead_email : undefined, quickStartDeliveryStatus: asDeliveryStatus(row.quick_start_delivery_status), quickStartDeliveryRequestedAt: typeof row.quick_start_delivery_requested_at === "string" ? row.quick_start_delivery_requested_at : undefined, quickStartDeliveryCompletedAt: typeof row.quick_start_delivery_completed_at === "string" ? row.quick_start_delivery_completed_at : undefined, quickStartDeliveryFailedAt: typeof row.quick_start_delivery_failed_at === "string" ? row.quick_start_delivery_failed_at : undefined, quickStartDeliveryError: typeof row.quick_start_delivery_error === "string" ? row.quick_start_delivery_error : undefined, funnelSessionId: typeof row.funnel_session_id === "string" ? row.funnel_session_id : undefined, customerId: typeof row.customer_id === "string" ? row.customer_id : undefined, selectedProducts, selectedTier: row.selected_tier === "P06" || row.selected_tier === "P16" || row.selected_tier === "P18" || row.selected_tier === "P17" ? row.selected_tier : "FREE", currentTotalCents: getSelectedTotalCents(selectedProducts), journeyVersion: typeof row.journey_version === "number" ? row.journey_version : 0, preP17Tier: row.pre_p17_tier === "P06" || row.pre_p17_tier === "P16" ? row.pre_p17_tier : undefined, currentStep: typeof row.current_step === "string" ? row.current_step : undefined, stripeCheckoutSessionId: typeof row.stripe_checkout_session_id === "string" ? row.stripe_checkout_session_id : undefined, checkoutTier: row.checkout_tier === "FREE" || row.checkout_tier === "P06" || row.checkout_tier === "P16" || row.checkout_tier === "P18" || row.checkout_tier === "P17" ? row.checkout_tier : undefined, checkoutPriceId: typeof row.checkout_price_id === "string" ? row.checkout_price_id : undefined, checkoutAmountCents: typeof row.checkout_amount_cents === "number" ? row.checkout_amount_cents : undefined, checkoutFingerprint: typeof row.checkout_fingerprint === "string" ? row.checkout_fingerprint : undefined, checkoutFingerprintVersion: typeof row.checkout_fingerprint_version === "string" ? row.checkout_fingerprint_version : undefined, branchReason: typeof row.branch_reason === "string" ? row.branch_reason as PokopiaJourney["branchReason"] : undefined, firstTouchAttribution: asRecord(row.first_touch_attribution), currentAttribution: asRecord(row.current_attribution), createdAt: typeof row.created_at === "string" ? row.created_at : undefined, updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined, completedAt: typeof row.completed_at === "string" ? row.completed_at : undefined };
}

export async function getOrCreatePokopiaJourney(id: string): Promise<PokopiaJourney | null> {
  const client = getSupabaseServerClient(); if (!client) return null;
  const { error } = await client.from("funnel_journeys").upsert({ id, funnel_id: "pokopia_daily_reset" }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`Could not create funnel journey: ${error.message}`);
  return getPokopiaJourney(id);
}
export async function getPokopiaJourney(id: string): Promise<PokopiaJourney | null> {
  const client = getSupabaseServerClient(); if (!client) return null;
  const { data, error } = await client.from("funnel_journeys").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not read funnel journey: ${error.message}`);
  return data ? fromRow(data as JourneyRow) : null;
}
export async function updatePokopiaJourney(id: string, journey: PokopiaJourney): Promise<PokopiaJourney | null> {
  const client = getSupabaseServerClient(); if (!client) return null;
  const selectedProducts = normalizeSelectedProducts(journey.selectedProducts);
  const update: Record<string, unknown> = { lead_email: journey.leadEmail ?? null, quick_start_delivery_status: journey.quickStartDeliveryStatus ?? "pending", quick_start_delivery_requested_at: journey.quickStartDeliveryRequestedAt ?? null, quick_start_delivery_completed_at: journey.quickStartDeliveryCompletedAt ?? null, quick_start_delivery_failed_at: journey.quickStartDeliveryFailedAt ?? null, quick_start_delivery_error: journey.quickStartDeliveryError ?? null, funnel_session_id: journey.funnelSessionId ?? null, customer_id: journey.customerId ?? null, selected_products: selectedProducts, selected_tier: journey.selectedTier, current_total_cents: getSelectedTotalCents(selectedProducts), pre_p17_tier: journey.preP17Tier ?? null, current_step: journey.currentStep ?? null, journey_version: journey.journeyVersion + 1, checkout_created: journey.checkoutCreated, checkout_completed: journey.checkoutCompleted, stripe_checkout_session_id: journey.stripeCheckoutSessionId ?? null, checkout_tier: journey.checkoutTier ?? null, checkout_price_id: journey.checkoutPriceId ?? null, checkout_amount_cents: journey.checkoutAmountCents ?? null, checkout_fingerprint: journey.checkoutFingerprint ?? null, checkout_fingerprint_version: journey.checkoutFingerprintVersion ?? null, branch_reason: journey.branchReason ?? null, first_touch_attribution: journey.firstTouchAttribution ?? null, current_attribution: journey.currentAttribution ?? null, completed_at: journey.completedAt ?? null, updated_at: new Date().toISOString() };
  for (const [key, column] of Object.entries(booleanColumns) as [keyof typeof booleanColumns, (typeof booleanColumns)[keyof typeof booleanColumns]][]) update[column] = journey[key];
  const { data, error } = await client.from("funnel_journeys").update(update).eq("id", id).eq("journey_version", journey.journeyVersion).select("*").maybeSingle();
  if (error) throw new Error(`Could not update funnel journey: ${error.message}`);
  return data ? fromRow(data as JourneyRow) : null;
}
export async function updatePokopiaLeadDelivery(id: string, fields: Pick<PokopiaJourney, "leadEmail" | "quickStartDeliveryStatus" | "quickStartDeliveryRequestedAt" | "quickStartDeliveryCompletedAt" | "quickStartDeliveryFailedAt" | "quickStartDeliveryError">): Promise<void> {
  const client = getSupabaseServerClient(); if (!client) return;
  const { error } = await client.from("funnel_journeys").update({ lead_email: fields.leadEmail ?? null, quick_start_delivery_status: fields.quickStartDeliveryStatus ?? "pending", quick_start_delivery_requested_at: fields.quickStartDeliveryRequestedAt ?? null, quick_start_delivery_completed_at: fields.quickStartDeliveryCompletedAt ?? null, quick_start_delivery_failed_at: fields.quickStartDeliveryFailedAt ?? null, quick_start_delivery_error: fields.quickStartDeliveryError ?? null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Could not update Quick Start delivery status: ${error.message}`);
}
export async function recordPokopiaJourneyEvent(id: string, eventName: string, details: { offerId?: string; productId?: string; funnelStep?: string; priorStep?: string; branch?: string; branchReason?: string; value?: number; funnelSessionId?: string; firstTouchAttribution?: Record<string, string>; currentAttribution?: Record<string, string> } = {}): Promise<void> {
  const client = getSupabaseServerClient(); if (!client) return;
  const { error } = await client.from("funnel_events").insert({ journey_id: id, event_name: eventName, offer_id: details.offerId ?? null, product_id: details.productId ?? null, funnel_step: details.funnelStep ?? null, prior_step: details.priorStep ?? null, branch: details.branch ?? null, branch_reason: details.branchReason ?? null, funnel_session_id: details.funnelSessionId ?? null, first_touch_attribution: details.firstTouchAttribution ?? null, current_attribution: details.currentAttribution ?? null, value: details.value ?? null, currency: details.value === undefined ? null : "USD" });
  if (error) throw new Error(`Could not record funnel event: ${error.message}`);
}
