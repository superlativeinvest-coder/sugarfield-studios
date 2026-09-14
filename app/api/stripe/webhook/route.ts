import Stripe from "stripe";
import { createOrderIdempotently } from "@/lib/orders/idempotency";
import { getOrderRepository } from "@/lib/orders/repository";
import { getStripeClient } from "@/lib/stripe/server";
import { getStripeWebhookSecret } from "@/lib/stripe/configuration";
import { P16_V2_FULFILLMENT_VERSION } from "@/lib/delivery/service";
import { P18_STAGED_FULFILLMENT_VERSION } from "@/lib/delivery/p18-staged";
import { getLiveP18StripePriceId } from "@/lib/stripe/configuration";
import { applyPostCompanionIntent } from "@/lib/pokopia-funnel/journey";
import { getOrCreatePokopiaJourney, recordPokopiaJourneyEvent, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { supabaseCustomerIdFromStripeMetadata } from "@/lib/customer/stripe-binding";

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) return Response.json({ error: "Stripe webhook is not configured yet." }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return Response.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return Response.json({ received: true });

  const productId = session.metadata?.product_id ?? session.metadata?.productId;
  if (!productId) return Response.json({ error: "Paid session is missing an internal product ID." }, { status: 400 });
  const customerId = supabaseCustomerIdFromStripeMetadata(session.metadata);
  if (!customerId) return Response.json({ error: "Paid session is missing a valid Supabase customer identity." }, { status: 400 });

  const repository = getOrderRepository();
  if (!repository) return Response.json({ error: "Order storage is not configured; Stripe should retry this event." }, { status: 503 });

  const parseAttribution = (value: string | undefined): Record<string, string> | undefined => {
    if (!value) return undefined;
    try { return JSON.parse(value) as Record<string, string>; } catch { return undefined; }
  };
  const grantedAt = new Date().toISOString();
  const stripePriceId = session.metadata?.stripe_price_id;
  if (productId === "P18" && (stripePriceId !== getLiveP18StripePriceId() || session.amount_total !== 2499 || session.currency !== "usd")) return Response.json({ error: "P18 payment does not match the canonical live package." }, { status: 400 });
  const fulfillmentVersion = productId === "P16" && stripePriceId === process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID ? P16_V2_FULFILLMENT_VERSION : productId === "P18" ? P18_STAGED_FULFILLMENT_VERSION : undefined;
  const { order } = await createOrderIdempotently(repository, {
    provider: "stripe",
    providerSessionId: session.id,
    providerEventId: event.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    productId,
    offerId: session.metadata?.offer_id,
    sourceOrderId: session.metadata?.source_order_id,
    sku: session.metadata?.sku ?? productId,
    amountTotal: session.amount_total ?? undefined,
    currency: session.currency ?? undefined,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
    customerId,
    funnelId: session.metadata?.funnel,
    funnelStep: session.metadata?.funnel_step,
    funnelSession: session.metadata?.funnel_session_id ?? session.metadata?.funnel_session,
    firstTouchAttribution: parseAttribution(session.metadata?.attribution_first_touch),
    currentTouchAttribution: parseAttribution(session.metadata?.attribution_current_touch),
    fulfillmentStatus: "pending",
    entitlements: [{ productId, grantedAt, ...(fulfillmentVersion ? { fulfillmentVersion } : {}), ...(stripePriceId ? { stripePriceId } : {}) }],
    createdAt: grantedAt,
  });
  // Stripe is the only place where a purchase changes durable journey truth.
  // A retry can repeat this safely because every transition is monotonic.
  const journeyId = session.metadata?.journey_id;
  if (journeyId) {
    const journey = await getOrCreatePokopiaJourney(journeyId);
    if (journey) {
      const cumulativeCheckout = session.metadata?.funnel_step === "checkout";
      const next = productId === "P06" ? applyPostCompanionIntent({ ...journey, dailyResetPurchased: true, ...(cumulativeCheckout ? { checkoutCompleted: true, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : {}) })
        : productId === "P16" ? applyPostCompanionIntent({ ...journey, companionPurchased: true, ...(cumulativeCheckout ? { checkoutCompleted: true, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : {}) })
          : productId === "P18" ? { ...journey, p18Purchased: true, checkoutCompleted: cumulativeCheckout || journey.checkoutCompleted, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt, branchReason: "P18_PURCHASE_TERMINAL_TEMPORARY" as const }
            : productId === "P17" ? { ...journey, p17Purchased: true, checkoutCompleted: cumulativeCheckout || journey.checkoutCompleted, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : journey;
      await updatePokopiaJourney(journeyId, next);
      await recordPokopiaJourneyEvent(journeyId, "pokopia_funnel_offer_purchased", { productId, offerId: session.metadata?.offer_id, funnelStep: session.metadata?.funnel_step, value: (session.amount_total ?? 0) / 100, branchReason: next.branchReason, funnelSessionId: session.metadata?.funnel_session_id ?? session.metadata?.funnel_session, firstTouchAttribution: parseAttribution(session.metadata?.attribution_first_touch), currentAttribution: parseAttribution(session.metadata?.attribution_current_touch) });
    }
  }
  return Response.json({ received: true, orderId: order.id });
}
