import { clearCheckout, getTier, getP18Readiness, isCumulativeCheckoutEnabled, checkoutFingerprintMatches, stripeSessionMatchesFingerprint, type PaidPokopiaTier } from "@/lib/pokopia-funnel/cumulative";
import { getPokopiaJourney, updatePokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { getStripeClient } from "@/lib/stripe/server";

function journeyIdFor(request: Request): string | undefined { return request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1]; }

export async function POST(request: Request): Promise<Response> {
  if (!isCumulativeCheckoutEnabled()) return Response.json({ error: "Cumulative checkout is not enabled." }, { status: 404 });
  const journeyId = journeyIdFor(request);
  const journey = journeyId ? await getPokopiaJourney(journeyId) : null;
  if (!journey || journey.checkoutCompleted || journey.selectedTier === "FREE") return Response.json({ error: "A payable Pokopia setup is required before checkout." }, { status: 403 });
  const tier = journey.selectedTier as PaidPokopiaTier;
  if (tier === "P18") { const readiness = getP18Readiness(); if (!readiness.ready) return Response.json({ error: readiness.reason }, { status: 503 }); }
  const definition = getTier(tier);
  if (!definition.stripePriceId) return Response.json({ error: "This final package has no configured Stripe Price ID." }, { status: 503 });
  const stripe = getStripeClient(); const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!stripe || !siteUrl) return Response.json({ error: "Stripe Checkout is not configured yet." }, { status: 503 });
  try {
    let currentJourney = journey;
    if (checkoutFingerprintMatches(currentJourney, tier) && currentJourney.stripeCheckoutSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(currentJourney.stripeCheckoutSessionId, { expand: ["line_items"] });
        if (stripeSessionMatchesFingerprint(existing, currentJourney, tier) && existing.url) return Response.json({ checkoutUrl: existing.url, reused: true });
      } catch { /* A stale or unavailable session must never be reused. */ }
      currentJourney = clearCheckout(currentJourney);
      await updatePokopiaJourney(currentJourney.journeyId, currentJourney);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment", line_items: [{ price: definition.stripePriceId, quantity: 1 }],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pokopia/funnel/checkout`,
      metadata: { product_id: tier, offer_id: `pokopia_cumulative_${tier.toLowerCase()}`, sku: tier, funnel: "pokopia_daily_reset", funnel_step: "checkout", funnel_session_id: journey.funnelSessionId ?? "", journey_id: journey.journeyId, selected_tier: tier, canonical_total_cents: String(definition.totalCents), stripe_price_id: definition.stripePriceId },
    });
    await updatePokopiaJourney(currentJourney.journeyId, { ...currentJourney, checkoutCreated: true, stripeCheckoutSessionId: session.id, checkoutTier: tier, checkoutPriceId: definition.stripePriceId, checkoutAmountCents: definition.totalCents, currentStep: "checkout" });
    return Response.json({ checkoutUrl: session.url ?? undefined, reused: false });
  } catch { return Response.json({ error: "Stripe could not create checkout for this setup." }, { status: 502 }); }
}
