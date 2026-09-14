import test from "node:test";
import assert from "node:assert/strict";
import { STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY, isSupabaseAuthUserId, supabaseCustomerIdFromStripeMetadata, supabaseCustomerMetadataForStripe } from "@/lib/customer/stripe-binding";

const customerId = "1eb8e6a1-0c3b-4432-8961-e5a70a329dae";

test("only a Supabase auth UUID from trusted Checkout metadata is usable as the order customer ID", () => {
  assert.equal(isSupabaseAuthUserId(customerId), true);
  assert.deepEqual(supabaseCustomerMetadataForStripe(customerId), { [STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY]: customerId });
  assert.equal(supabaseCustomerIdFromStripeMetadata({ [STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY]: customerId }), customerId);
  assert.equal(supabaseCustomerIdFromStripeMetadata({ [STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY]: "cus_stripe_customer" }), null);
  assert.equal(supabaseCustomerIdFromStripeMetadata({}), null);
  assert.throws(() => supabaseCustomerMetadataForStripe("cus_stripe_customer"));
});

test("a different Supabase user ID cannot be confused with the purchaser identity", () => {
  const differentCustomerId = "559c1dd7-ae0a-4d27-9aa9-7995c5e5f14c";
  const boundCustomerId = supabaseCustomerIdFromStripeMetadata({ [STRIPE_SUPABASE_CUSTOMER_ID_METADATA_KEY]: customerId });
  assert.notEqual(boundCustomerId, differentCustomerId);
});
