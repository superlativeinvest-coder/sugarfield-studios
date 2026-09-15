import { getCustomerSession } from "@/lib/customer/session";
import { supabaseCustomerMetadataForStripe } from "@/lib/customer/stripe-binding";
import { getQuickStartStripePriceId, isStripeSandboxMode } from "@/lib/stripe/configuration";
import { getStripeClient } from "@/lib/stripe/server";

type CheckoutBody = {
  funnelSession?: unknown;
  attribution?: { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> };
};

function safeAttribution(value: Record<string, string> | undefined): string | undefined {
  return value ? JSON.stringify(value).slice(0, 500) : undefined;
}

export async function POST(request: Request): Promise<Response> {
  // This route is deliberately confined to Stripe Sandbox. A live key, even
  // if configured elsewhere, can never create a no-cost Quick Start session.
  if (!isStripeSandboxMode()) return Response.json({ error: "Free Stripe checkout is available only in the Preview test environment." }, { status: 503 });
  const stripe = getStripeClient();
  const priceId = getQuickStartStripePriceId();
  if (!stripe || !priceId) return Response.json({ error: "Free Stripe checkout is not configured yet." }, { status: 503 });
  const customerSession = await getCustomerSession();
  if (!customerSession) return Response.json({ error: "Sign in is required before secure Quick Start delivery." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as CheckoutBody;
  const journeyId = request.headers.get("cookie")?.match(/(?:^|; )sf_pokopia_journey=([^;]+)/)?.[1];
  const origin = new URL(request.url).origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pokopia/funnel/start`,
      metadata: {
        product_id: "FREE-QUICK-START",
        offer_id: "pokopia_quick_start_pack",
        sku: "pokopia_quick_start_pack",
        stripe_price_id: priceId,
        funnel: "pokopia_daily_reset",
        funnel_step: "start",
        ...(typeof body.funnelSession === "string" ? { funnel_session_id: body.funnelSession.slice(0, 120) } : {}),
        ...(journeyId ? { journey_id: journeyId } : {}),
        ...(safeAttribution(body.attribution?.firstTouch) ? { attribution_first_touch: safeAttribution(body.attribution?.firstTouch)! } : {}),
        ...(safeAttribution(body.attribution?.currentTouch) ? { attribution_current_touch: safeAttribution(body.attribution?.currentTouch)! } : {}),
        ...supabaseCustomerMetadataForStripe(customerSession.customer.id),
      },
    });
    return Response.json({ checkoutUrl: session.url ?? undefined });
  } catch {
    return Response.json({ error: "Stripe could not create the free checkout session." }, { status: 502 });
  }
}
