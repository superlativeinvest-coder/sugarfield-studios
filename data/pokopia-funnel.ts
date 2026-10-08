import { getProductBySlug } from "@/lib/catalog/data";
import type { SugarfieldProduct } from "@/lib/catalog/types";

export const POKOPIA_FUNNEL_ID = "pokopia_daily_reset";
export const POKOPIA_FUNNEL_VERSION = "v1";

export type PokopiaFunnelOffer = {
  id: string; title: string; shortTitle: string;
  role: "free_starter" | "core_offer" | "upsell"; catalogProductId?: string; catalogSlug?: string; productSku?: string;
  productId?: string;
  regularPrice?: number; funnelPrice?: number; currency: "USD"; stripePriceId?: string;
  image?: string; description: string; benefits: string[]; includedProducts: string[];
  cta: string; skipCta?: string; enabled: boolean; assetReady: boolean; fulfillmentReady: boolean;
  nextStepOnPurchase?: string; nextStepOnSkip?: string;
};

export const pokopiaFunnelOffers = {
  freeStarter: {
    id: "pokopia_quick_start_pack", productId: "FREE-QUICK-START", productSku: "pokopia_quick_start_pack", title: "POKOPIA QUICK START PACK", shortTitle: "Pokopia Quick Start Pack", role: "free_starter", currency: "USD",
    description: "A free 7-page printable pack for planning your next Pokopia session.",
    benefits: ["7 printable pages", "US Letter and A4 PDFs", "Session goals and daily priorities", "Island sketching and rare finds notes", "Weekly planning"], includedProducts: ["pokopia-quick-start-pack"], cta: "GET THE FREE QUICK START PACK", enabled: true, assetReady: true, fulfillmentReady: true, nextStepOnPurchase: "/pokopia/daily-reset",
  },
  dailyReset: {
    id: "pokopia_daily_reset_checklist", title: "POKOPIA DAILY RESET CHECKLIST", shortTitle: "Pokopia Daily Reset Checklist", role: "core_offer", catalogProductId: "P06", catalogSlug: "pokopia-daily-reset-checklist", funnelPrice: 4.99, currency: "USD",
    description: "A repeatable Pokopia organization system for your regular play sessions.", benefits: ["Start with your priorities", "Check habitat, farming, and cooking", "Remember daily Mosslax tasks", "Prep for your next session"], includedProducts: ["pokopia-daily-reset-checklist"], cta: "BUY", skipCta: "SKIP", enabled: true, assetReady: true, fulfillmentReady: true, image: "/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-1.png", nextStepOnPurchase: "/pokopia/companion",
  },
  companion: {
    id: "pokopia_companion", title: "POKOPIA ADVENTURE COMPANION", shortTitle: "Pokopia Adventure Companion", role: "upsell", catalogProductId: "P16", catalogSlug: "pokopia-adventure-companion", productSku: "pokopia_adventure_companion", funnelPrice: 19.99, currency: "USD",
    description: "Bring event tracking, exploration, build planning, field-guide reference, and broader progress together in one organized companion.",
    benefits: ["Track events and rare finds", "Plan Cloud Island builds", "Organize exploration progress", "Keep field-guide references together", "Use one Adventure Dashboard"], includedProducts: ["pokopia-daily-reset-checklist", "pokopia-event-tracker", "pokopia-spawn-tracker", "pokopia-cloud-islands-planner", "pokopia-field-guide", "pokopia-adventure-dashboard"], cta: "BUY", skipCta: "SKIP", enabled: true, assetReady: true, fulfillmentReady: true, image: "/assets/products/pokopia/companion/p16-adventure-companion.png",
  },
  completePlayerSystem: {
    id: "pokopia_complete_player_system", title: "POKOPIA COMPLETE PLAYER SYSTEM", shortTitle: "Pokopia Complete Player System", role: "upsell", catalogProductId: "P18", catalogSlug: "pokopia-complete-player-system", productSku: "pokopia_complete_player_system", regularPrice: 49.99, funnelPrice: 24.99, currency: "USD",
    description: "An integrated Pokopia system for players who want their core tools working together instead of piecing together separate trackers.", benefits: ["11 coordinated Pokopia components", "22 PDFs: US Letter and A4 versions of every component", "43 printable pages in each format", "One complete player system"], includedProducts: [], cta: "BUY", skipCta: "SKIP", enabled: true, assetReady: true, fulfillmentReady: true, nextStepOnPurchase: "/pokopia/checkout",
  },
  completionistKit: {
    id: "pokopia_completionist_kit", title: "POKOPIA COMPLETIONIST KIT", shortTitle: "Pokopia Completionist Kit", role: "upsell", catalogProductId: "P17", catalogSlug: "pokopia-completionist-kit", productSku: "P17", funnelPrice: 14.99, regularPrice: 14.99, currency: "USD",
    description: "A completion-focused reference set with the Field Guide in US Letter and A4 plus the 26-Card Reference Collection.", benefits: ["Field Guide quick reference", "Field Guide in US Letter and A4", "26 numbered collection cards", "A focused completion reference set"], includedProducts: ["pokopia-field-guide", "pokopia-26-card-collection"], cta: "BUY", skipCta: "SKIP", enabled: true, assetReady: true, fulfillmentReady: true, image: "/assets/products/pokopia/completionist-kit/p17-completionist-kit-hero.png", nextStepOnPurchase: "/pokopia/checkout",
  },
} satisfies Record<string, PokopiaFunnelOffer>;

export function getPokopiaFunnelProduct(offer: PokopiaFunnelOffer): SugarfieldProduct | undefined { return offer.catalogSlug ? getProductBySlug(offer.catalogSlug) : undefined; }
export function isOfferCheckoutReady(offer: PokopiaFunnelOffer): boolean {
  return Boolean(offer.enabled && offer.assetReady && offer.fulfillmentReady);
}
