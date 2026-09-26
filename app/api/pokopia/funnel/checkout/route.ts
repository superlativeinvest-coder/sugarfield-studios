import { CHECKOUT_SCHEMA_VERSION, createCheckoutFingerprint, getCanonicalLineItems, getCheckoutDisplayLineItems, getP18Readiness, getSelectedTotalCents, hasPaidSelection, isCumulativeCheckoutEnabled, stripeSessionMatchesFingerprint } from "@/lib/pokopia-funnel/cumulative";
import { getPokopiaJourney, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { getStripeClient } from "@/lib/stripe/server";
import { getCustomerSession } from "@/lib/customer/session";
import { supabaseCustomerMetadataForStripe } from "@/lib/customer/stripe-binding";

function journeyIdFor(request: Request): string | undefined { return request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1]; }

export async function POST(request: Request): Promise<Response> {
  if (!isCumulativeCheckoutEnabled()) return Response.json({ error: "Cumulative checkout is not enabled for staging." }, { status: 404 });
  const journeyId = journeyIdFor(request); const journey = journeyId ? await getPokopiaJourney(journeyId) : null;
  if (!journey || journey.checkoutCompleted || !hasPaidSelection(journey)) return Response.json({ error: "A paid Pokopia selection is required before checkout." }, { status: 403 });
  const items = getCanonicalLineItems(journey.selectedProducts);
  const checkoutItems = getCheckoutDisplayLineItems(journey.selectedProducts, journey.quickStartClaimed);
  if (!items.length) return Response.json({ error: "No paid products are selected." }, { status: 403 });
  if (items.some((item) => !item.stripePriceId)) return Response.json({ error: "A selected staging price is not configured." }, { status: 503 });
  if (journey.selectedProducts.includes("P18")) { const readiness = getP18Readiness(); if (!readiness.ready) return Response.json({ error: readiness.reason }, { status: 503 }); }
  const customerSession = await getCustomerSession(); if (!customerSession) return Response.json({ error: "Sign in is required before checkout so your downloads can be secured." }, { status: 401 });
  if (journey.customerId && journey.customerId !== customerSession.customer.id) return Response.json({ error: "This funnel journey belongs to another signed-in customer." }, { status: 403 });
  const stripe = getStripeClient(); if (!stripe) return Response.json({ error: "Stripe Checkout is not configured yet." }, { status: 503 });
  const fingerprint = createCheckoutFingerprint(journey.journeyId, journey.selectedProducts);
  const totalCents = getSelectedTotalCents(journey.selectedProducts);
  const current = { ...journey, customerId: customerSession.customer.id, checkoutFingerprint: fingerprint, checkoutFingerprintVersion: CHECKOUT_SCHEMA_VERSION, checkoutAmountCents: totalCents, currentStep: "checkout" };
  try {
    if (current.stripeCheckoutSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(current.stripeCheckoutSessionId, { expand: ["line_items"] });
        if (stripeSessionMatchesFingerprint(existing, current) && existing.url) return Response.json({ checkoutUrl: existing.url, reused: true });
      } catch { /* A stale or changed cart session is never reused. */ }
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: checkoutItems.map((item) => item.productId === "FREE-QUICK-START"
        ? item.stripePriceId ? { price: item.stripePriceId, quantity: 1 } : { price_data: { currency: "usd", unit_amount: 0, product_data: { name: "Free Quick Start Pack" } }, quantity: 1 }
        : { price: item.stripePriceId!, quantity: 1 }),
      success_url: `${siteUrl}/pokopia/funnel/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pokopia/funnel/checkout`,
      metadata: {
        product_id: items[0].productId,
        sku: items[0].sku,
        offer_id: "pokopia_accumulated_order",
        funnel: "pokopia_daily_reset",
        funnel_step: "checkout",
        journey_id: current.journeyId,
        funnel_session_id: current.funnelSessionId ?? "",
        selected_product_ids: journey.selectedProducts.join(","),
        checkout_fingerprint: fingerprint,
        checkout_schema_version: CHECKOUT_SCHEMA_VERSION,
        canonical_total_cents: String(totalCents),
        free_pack_claimed: String(journey.quickStartClaimed),
        ...supabaseCustomerMetadataForStripe(customerSession.customer.id),
      },
    });
    const saved = await updatePokopiaJourney(current.journeyId, { ...current, checkoutCreated: true, stripeCheckoutSessionId: session.id, checkoutTier: undefined, checkoutPriceId: undefined });
    if (!saved) return Response.json({ error: "Could not persist checkout state." }, { status: 503 });
    return Response.json({ checkoutUrl: session.url ?? undefined, reused: false });
  } catch { return Response.json({ error: "Stripe could not create a checkout session." }, { status: 502 }); }
}
