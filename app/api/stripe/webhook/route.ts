import Stripe from "stripe";
import { createOrderIdempotently } from "@/lib/orders/idempotency";
import { getOrderRepository } from "@/lib/orders/repository";
import { getStripeClient } from "@/lib/stripe/server";
import { getQuickStartStripePriceId, getStripeWebhookSecret } from "@/lib/stripe/configuration";
import { P16_V3_FULFILLMENT_VERSION } from "@/lib/delivery/service";
import { P18_STAGED_FULFILLMENT_VERSION } from "@/lib/delivery/p18-staged";
import { getCanonicalP18StripePriceId } from "@/lib/stripe/configuration";
import { getOrCreatePokopiaJourney, recordPokopiaJourneyEvent, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { supabaseCustomerIdFromStripeMetadata } from "@/lib/customer/stripe-binding";
import { CHECKOUT_SCHEMA_VERSION, getCanonicalLineItems, getSelectedTotalCents, isSelectedProduct, normalizeSelectedProducts } from "@/lib/pokopia-funnel/cumulative";

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

  const selectedProducts = normalizeSelectedProducts((session.metadata?.selected_product_ids ?? "").split(",").filter(isSelectedProduct));
  const isAccumulatedOrder = session.metadata?.funnel_step === "checkout" && Boolean(session.metadata?.checkout_fingerprint);
  if (isAccumulatedOrder) {
    const journeyId = session.metadata?.journey_id;
    if (!journeyId || !selectedProducts.length || session.metadata?.checkout_schema_version !== CHECKOUT_SCHEMA_VERSION) return Response.json({ error: "Accumulated checkout metadata is invalid." }, { status: 400 });
    const journey = await getOrCreatePokopiaJourney(journeyId);
    if (!journey || journey.checkoutFingerprint !== session.metadata?.checkout_fingerprint || journey.checkoutFingerprintVersion !== CHECKOUT_SCHEMA_VERSION || normalizeSelectedProducts(journey.selectedProducts).join(",") !== selectedProducts.join(",")) return Response.json({ error: "Accumulated checkout does not match its server journey." }, { status: 400 });
    const expectedItems = getCanonicalLineItems(selectedProducts);
    if (expectedItems.some((item) => !item.stripePriceId) || session.amount_total !== getSelectedTotalCents(selectedProducts) || session.currency !== "usd") return Response.json({ error: "Accumulated checkout total is invalid." }, { status: 400 });
    const verifiedSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] });
    const stripeItems = verifiedSession.line_items?.data ?? [];
    if (stripeItems.length !== expectedItems.length || !expectedItems.every((expected) => stripeItems.some((item) => { const price = typeof item.price === "string" ? undefined : item.price; return item.quantity === 1 && price?.id === expected.stripePriceId && price?.unit_amount === expected.unitAmount && price.currency === "usd"; }))) return Response.json({ error: "Accumulated checkout line items are invalid." }, { status: 400 });
    const grantedAt = new Date().toISOString();
    const entitlementFor = (productId: typeof selectedProducts[number]) => ({ productId, grantedAt, ...(productId === "P16" ? { fulfillmentVersion: P16_V3_FULFILLMENT_VERSION } : {}), ...(productId === "P18" ? { fulfillmentVersion: P18_STAGED_FULFILLMENT_VERSION } : {}), stripePriceId: expectedItems.find((item) => item.productId === productId)?.stripePriceId });
    const { order } = await createOrderIdempotently(repository, { provider: "stripe", providerSessionId: session.id, providerEventId: event.id, paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined, productId: selectedProducts[0], offerId: "pokopia_accumulated_order", sku: expectedItems[0].sku, amountTotal: session.amount_total ?? undefined, currency: session.currency ?? undefined, customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined, customerId, funnelId: "pokopia_daily_reset", funnelStep: "checkout", funnelSession: session.metadata?.funnel_session_id, fulfillmentStatus: "fulfilled", lineItems: expectedItems.map((item) => ({ productId: item.productId, sku: item.sku, stripePriceId: item.stripePriceId, unitAmount: item.unitAmount, quantity: 1, currency: item.currency })), entitlements: selectedProducts.map(entitlementFor), createdAt: grantedAt });
    const completed = { ...journey, dailyResetPurchased: journey.dailyResetPurchased || selectedProducts.includes("P06"), companionPurchased: journey.companionPurchased || selectedProducts.includes("P16"), p18Purchased: journey.p18Purchased || selectedProducts.includes("P18"), p17Purchased: journey.p17Purchased || selectedProducts.includes("P17"), checkoutCompleted: true, journeyCompleted: true, currentStep: "complete", completedAt: journey.completedAt ?? grantedAt };
    await updatePokopiaJourney(journeyId, completed);
    await recordPokopiaJourneyEvent(journeyId, "pokopia_funnel_offer_purchased", { productId: selectedProducts.join(","), offerId: "pokopia_accumulated_order", funnelStep: "checkout", value: session.amount_total ?? 0, funnelSessionId: session.metadata?.funnel_session_id });
    return Response.json({ received: true, orderId: order.id });
  }

  const parseAttribution = (value: string | undefined): Record<string, string> | undefined => {
    if (!value) return undefined;
    try { return JSON.parse(value) as Record<string, string>; } catch { return undefined; }
  };
  const grantedAt = new Date().toISOString();
  const stripePriceId = session.metadata?.stripe_price_id;
  if (productId === "FREE-QUICK-START" && (stripePriceId !== getQuickStartStripePriceId() || session.amount_total !== 0 || session.currency !== "usd")) return Response.json({ error: "Quick Start checkout does not match the configured Sandbox no-cost offer." }, { status: 400 });
  if (productId === "P18" && (stripePriceId !== getCanonicalP18StripePriceId() || session.amount_total !== 2499 || session.currency !== "usd")) return Response.json({ error: "P18 payment does not match the canonical package." }, { status: 400 });
  // Existing P16 entitlements keep their recorded V2 mapping. Only newly
  // completed P16 orders receive the staged V3 customer-delivery package.
  const fulfillmentVersion = productId === "P16" && stripePriceId === process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID ? P16_V3_FULFILLMENT_VERSION : productId === "P18" ? P18_STAGED_FULFILLMENT_VERSION : undefined;
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
      const next = productId === "FREE-QUICK-START" ? { ...journey, quickStartClaimed: true, currentStep: "daily-reset" }
        : productId === "P06" ? { ...journey, dailyResetPurchased: true, ...(cumulativeCheckout ? { checkoutCompleted: true, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : {}) }
        : productId === "P16" ? { ...journey, companionPurchased: true, ...(cumulativeCheckout ? { checkoutCompleted: true, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : {}) }
          : productId === "P18" ? { ...journey, p18Purchased: true, checkoutCompleted: cumulativeCheckout || journey.checkoutCompleted, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt, branchReason: "P18_PURCHASE_TERMINAL_TEMPORARY" as const }
            : productId === "P17" ? { ...journey, p17Purchased: true, checkoutCompleted: cumulativeCheckout || journey.checkoutCompleted, journeyCompleted: true, completedAt: journey.completedAt ?? grantedAt } : journey;
      await updatePokopiaJourney(journeyId, next);
      // funnel_events.value is stored as integer cents, matching Stripe's amount_total.
      await recordPokopiaJourneyEvent(journeyId, "pokopia_funnel_offer_purchased", { productId, offerId: session.metadata?.offer_id, funnelStep: session.metadata?.funnel_step, value: session.amount_total ?? 0, branchReason: next.branchReason, funnelSessionId: session.metadata?.funnel_session_id ?? session.metadata?.funnel_session, firstTouchAttribution: parseAttribution(session.metadata?.attribution_first_touch), currentAttribution: parseAttribution(session.metadata?.attribution_current_touch) });
    }
  }
  return Response.json({ received: true, orderId: order.id });
}
