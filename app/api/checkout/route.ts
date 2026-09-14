import { getCheckoutProduct, isCompanionUpgradeRequest, isCompletePlayerSystemRequest, isCompletionistUpgradeRequest, isMiniToolUpgradeRequest, validateCheckoutRequest } from "@/lib/commerce/checkout";
import type { CheckoutResponse } from "@/lib/commerce/types";
import { getStripeClient } from "@/lib/stripe/server";
import { isVerifiedCompanionBuyer, isVerifiedDailyResetBuyer, qualifiesForDailyResetUpgrade } from "@/lib/orders/qualification";
import { getOrderRepository } from "@/lib/orders/repository";
import { canViewP17Downsell } from "@/lib/pokopia-funnel/journey";
import { getPokopiaJourney } from "@/lib/pokopia-funnel/journey-repository";
import { getCustomerSession } from "@/lib/customer/session";
import { supabaseCustomerMetadataForStripe } from "@/lib/customer/stripe-binding";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request." } satisfies CheckoutResponse, { status: 400 });
  }

  const checkoutRequest = validateCheckoutRequest(body);
  if (!checkoutRequest) return Response.json({ error: "A valid internal product ID is required." } satisfies CheckoutResponse, { status: 400 });

  if (checkoutRequest.offerId === "pokopia_companion" || checkoutRequest.funnelStep === "companion") {
    if (!isCompanionUpgradeRequest(checkoutRequest)) return Response.json({ error: "Invalid Adventure Companion checkout request." } satisfies CheckoutResponse, { status: 403 });
  }

  if (checkoutRequest.offerId === "pokopia_completionist_kit" || checkoutRequest.funnelStep === "completionist-kit") {
    if (!isCompletionistUpgradeRequest(checkoutRequest)) return Response.json({ error: "Invalid Completionist Kit checkout request." } satisfies CheckoutResponse, { status: 403 });
    const journeyId = request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1];
    const journey = journeyId ? await getPokopiaJourney(journeyId) : null;
    if (!journey || !canViewP17Downsell(journey)) return Response.json({ error: "The Completionist Kit is available only after a verified P18 skip." } satisfies CheckoutResponse, { status: 403 });
  }

  if (checkoutRequest.offerId === "pokopia_complete_player_system" || checkoutRequest.funnelStep === "complete-player-system") {
    if (!isCompletePlayerSystemRequest(checkoutRequest)) return Response.json({ error: "Invalid Complete Player System checkout request." } satisfies CheckoutResponse, { status: 403 });
    const repository = getOrderRepository();
    const source = repository && checkoutRequest.sourceOrderId ? await repository.findById(checkoutRequest.sourceOrderId) : null;
    if (!source || (!isVerifiedDailyResetBuyer(source) && !isVerifiedCompanionBuyer(source))) return Response.json({ error: "A verified Daily Reset or Adventure Companion order is required." } satisfies CheckoutResponse, { status: 403 });
  }

  const product = getCheckoutProduct(checkoutRequest.productId);
  if (!product) return Response.json({ error: "This product is not available for checkout yet." } satisfies CheckoutResponse, { status: 503 });

  if (product.id === "P13") {
    if (!isMiniToolUpgradeRequest(checkoutRequest)) {
      return Response.json({ error: "A verified Daily Reset order is required for this upgrade." } satisfies CheckoutResponse, { status: 403 });
    }
    const sourceOrderId = checkoutRequest.sourceOrderId;
    if (!sourceOrderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceOrderId)) {
      return Response.json({ error: "A verified Daily Reset order is required for this upgrade." } satisfies CheckoutResponse, { status: 403 });
    }
    const repository = getOrderRepository();
    if (!repository || !(await qualifiesForDailyResetUpgrade(repository, { orderId: sourceOrderId }))) {
      return Response.json({ error: "A verified Daily Reset order is required for this upgrade." } satisfies CheckoutResponse, { status: 403 });
    }
  }

  const stripe = getStripeClient();
  if (!stripe) return Response.json({ error: "Stripe Checkout is not configured yet." } satisfies CheckoutResponse, { status: 503 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return Response.json({ error: "The site URL is not configured for checkout redirects." } satisfies CheckoutResponse, { status: 503 });

  const priceId = product.commerce?.stripePriceId;
  if (!priceId) return Response.json({ error: "This checkout price is not configured yet." } satisfies CheckoutResponse, { status: 503 });
  const customerSession = await getCustomerSession();
  if (!customerSession) return Response.json({ error: "Sign in is required before checkout so your downloads can be secured." } satisfies CheckoutResponse, { status: 401 });

  try {
    const journeyId = request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: checkoutRequest.funnelId === "pokopia_daily_reset" ? `${siteUrl}/pokopia/funnel/daily-reset` : `${siteUrl}/products/${product.slug}`,
      metadata: {
        product_id: product.id,
        offer_id: checkoutRequest.offerId ?? product.id,
        sku: checkoutRequest.sku ?? product.id,
        stripe_price_id: priceId,
        ...supabaseCustomerMetadataForStripe(customerSession.customer.id),
        upgrade: String(checkoutRequest.upgrade ?? false),
        ...(checkoutRequest.sourceOrderId ? { source_order_id: checkoutRequest.sourceOrderId } : {}),
        ...(checkoutRequest.funnelId ? { funnel: checkoutRequest.funnelId } : {}),
        ...(checkoutRequest.funnelStep ? { funnel_step: checkoutRequest.funnelStep } : {}),
        ...(checkoutRequest.funnelSession ? { funnel_session_id: checkoutRequest.funnelSession } : {}),
        ...(journeyId ? { journey_id: journeyId } : {}),
        ...(checkoutRequest.attribution?.firstTouch ? { attribution_first_touch: JSON.stringify(checkoutRequest.attribution.firstTouch).slice(0, 500) } : {}),
        ...(checkoutRequest.attribution?.currentTouch ? { attribution_current_touch: JSON.stringify(checkoutRequest.attribution.currentTouch).slice(0, 500) } : {}),
      },
    });
    return Response.json({ checkoutUrl: session.url ?? undefined } satisfies CheckoutResponse);
  } catch {
    return Response.json({ error: "Stripe could not create a checkout session." } satisfies CheckoutResponse, { status: 502 });
  }
}
