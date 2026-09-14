# Pokopia Daily Reset Commerce Validation

## Current boundary

The Daily Reset flow uses Stripe Checkout as the payment layer and Supabase/Postgres as the verified order store. The only payment event processed is `checkout.session.completed` when Stripe reports `payment_status = paid`.

The webhook validates the Stripe signature, stores the Checkout Session ID, event ID, Payment Intent ID, product SKU, funnel metadata, attribution, pending fulfillment state, and the P06 entitlement. The unique provider session and event identifiers make repeated webhook delivery safe.

## Checkout test procedure

1. Set the Stripe test secret, Daily Reset Price ID, webhook signing secret, Supabase URL, and Supabase service-role key in `.env.local`.
2. Run both local processes:

   ```powershell
   npm.cmd run dev
   stripe.cmd listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Open `/pokopia/funnel/daily-reset` and use Stripe test mode with `4242 4242 4242 4242`, any future expiry, and any CVC.
4. Confirm the webhook returns success and inspect `public.orders` in Supabase.

## Expected order and fulfillment behavior

- A paid Checkout Session creates exactly one order with `status = paid`.
- The order contains a P06 entitlement and starts with `fulfillment_status = pending`.
- The download endpoint first verifies the paid order and matching entitlement server-side.
- It then creates one-hour signed URLs for the private A4 and US Letter objects.
- Only after URL generation succeeds does fulfillment change to `fulfilled`.
- Missing, unpaid, cancelled, mismatched, or random order contexts receive no entitlement or signed URL.

## Cancellation and spoof prevention

Checkout cancellation returns to `/pokopia/funnel/daily-reset` and creates no order. Query parameters, local storage flags, and client-side purchase flags are not consulted by the webhook, qualification helper, or download endpoint.

## Future Sequence 2 qualification

`lib/orders/qualification.ts` exposes the server-side `qualifiesForDailyResetUpgrade` helper. It returns true only when Supabase contains a paid P06 order with a matching P06 entitlement. No Complete Companion offer is exposed by this pass.

## Required human actions

- Run `supabase/migrations/202608290003_stripe_order_identifiers.sql` after the first two migrations.
- Keep the `digital-products` bucket private.
- Complete one Stripe test-mode checkout and confirm the resulting order and signed downloads.
- Confirm the deployed webhook URL before production use; local Stripe CLI forwarding is for development only.

## Final validation status

- Migration 003: not confirmed; the live schema check currently reports the Stripe identifier columns are missing.
- Stripe configuration: secret key, webhook signing secret shape, and Daily Reset Price ID are configured locally. Remove any duplicate empty `STRIPE_WEBHOOK_SECRET=` line before restarting the app.
- Supabase connection: verified; the existing `public.orders` table is reachable.
- Test purchase, webhook persistence, entitlement, signed download, fulfillment transition, replay/idempotency, and cancellation: not claimed until migration 003 is applied and one real Stripe test-mode checkout is completed.
- Buyer qualification helper: automated positive and negative tests pass; no Sequence 2 route is exposed.
