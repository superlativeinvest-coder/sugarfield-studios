export const STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY = "supabase_customer_id";

// Supabase auth.users IDs are UUIDs. Stripe customer IDs (for example cus_*)
// must never be stored in orders.customer_id or used for download authorization.
export function isSupabaseAuthUserId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function supabaseCustomerMetadataForStripe(customerId: string): Record<typeof STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY, string> {
  if (!isSupabaseAuthUserId(customerId)) throw new Error("A valid Supabase auth user ID is required for Stripe Checkout.");
  return { [STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY]: customerId };
}

export function supabaseCustomerIdFromStripeMetadata(metadata: Record<string, string> | null | undefined): string | null {
  const value = metadata?.[STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY];
  return isSupabaseAuthUserId(value) ? value : null;
}
