import type { SugarfieldBundle, SugarfieldCollection, SugarfieldProduct } from "./types";
import { getDailyResetStripePriceId } from "@/lib/stripe/configuration";

const dailyResetStripePriceId = getDailyResetStripePriceId();

// Development catalog records are intentionally unpriced and image-free until
// approved product truth is connected. Unpublished records are safe for future
// catalog work but are excluded from public selectors.
export const products: SugarfieldProduct[] = [
  {
    id: "P01",
    slug: "cloud-islands-build-planner",
    name: "Cloud Islands Build Planner",
    game: "Pokopia",
    collection: ["pokopia", "building-tools"],
    playerTypes: ["builder", "cozy-gamer"],
    productType: "planner",
    description: "A planning tool for organizing a Cloud Islands build.",
    shortBenefit: "Plan your layout before moving everything around in-game.",
    images: {},
    commerce: { provider: "stripe", active: false },
    relatedProductIds: [],
    bundleIds: [],
    featured: true,
    new: true,
    published: true,
  },
  {
    id: "P02",
    slug: "pokopia-field-guide",
    name: "Pokopia Field Guide",
    game: "Pokopia",
    collection: ["pokopia", "completion-tools"],
    playerTypes: ["completionist", "collector"],
    productType: "guide",
    description: "A reference guide for keeping your Pokopia goals organized.",
    shortBenefit: "Keep useful game information close while you play.",
    images: {},
    commerce: { provider: "stripe", active: false },
    relatedProductIds: [],
    bundleIds: [],
    new: true,
    published: true,
  },
  {
    id: "P03",
    slug: "habitat-master-checklist",
    name: "Habitat Master Checklist",
    game: "Pokopia",
    collection: ["pokopia", "completion-tools"],
    playerTypes: ["completionist", "collector"],
    productType: "checklist",
    description: "A checklist foundation for tracking habitat progress.",
    shortBenefit: "See what you have covered and what comes next.",
    images: {},
    commerce: { provider: "stripe", active: false },
    relatedProductIds: [],
    bundleIds: [],
    published: true,
  },
  {
    id: "P06",
    slug: "pokopia-daily-reset-checklist",
    name: "Pokopia Daily Reset Checklist",
    game: "Pokopia",
    collection: ["pokopia", "tracking-tools"],
    playerTypes: ["completionist", "cozy-gamer"],
    productType: "checklist",
    description: "A two-page checklist for resetting your Pokopia routine, tracking daily priorities, and preparing for the next session.",
    shortBenefit: "Reset your routine, track what matters, and know where to begin.",
    benefits: ["Morning priorities", "Habitat and exploration checks", "Farming and cooking reminders", "Mosslax reminders", "Evening prep and notes"],
    contents: ["2-page A4 PDF", "2-page US Letter PDF"],
    price: 4.99,
    currency: "USD",
    images: { hero: "/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-1.png", gallery: ["/assets/products/pokopia/daily-reset/p06-daily-reset-checklist-page-2.png"] },
    delivery: { digital: true, formats: ["PDF (A4)", "PDF (US Letter)"], fileCount: 2 },
    commerce: { provider: "stripe", active: Boolean(dailyResetStripePriceId), stripePriceId: dailyResetStripePriceId },
    relatedProductIds: [],
    bundleIds: [],
    new: true,
    published: true,
  },
  {
    id: "P13",
    slug: "pokopia-event-tracker",
    name: "Pokopia Event Tracker",
    game: "Pokopia",
    collection: ["pokopia", "tracking-tools"],
    playerTypes: ["completionist", "cozy-gamer"],
    productType: "tracker",
    description: "A reusable four-page tracker for Pokopia event dashboards, materials, rewards, and countdown notes.",
    shortBenefit: "Keep limited-time event goals, materials, and rewards organized.",
    benefits: ["Event dashboard", "Material collection tracker", "Reward checklist", "31-day countdown calendar"],
    contents: ["4-page A4 PDF", "4-page US Letter PDF"],
    price: 3.99,
    currency: "USD",
    images: { hero: "/assets/products/pokopia/mini-tool/p13-event-tracker-page-1.png", gallery: ["/assets/products/pokopia/mini-tool/p13-event-tracker-page-1.png"] },
    delivery: { digital: true, formats: ["PDF (A4)", "PDF (US Letter)"], fileCount: 2 },
    commerce: { provider: "stripe", active: Boolean(process.env.STRIPE_MINI_TOOL_PRICE_ID), stripePriceId: process.env.STRIPE_MINI_TOOL_PRICE_ID },
    relatedProductIds: ["P06"],
    bundleIds: [],
    new: true,
    published: true,
  },
  {
    id: "P16",
    slug: "pokopia-adventure-companion",
    name: "Pokopia Adventure Companion",
    game: "Pokopia",
    collection: ["pokopia", "completion-tools"],
    playerTypes: ["builder", "collector", "completionist"],
    productType: "bundle",
    description: "A six-component planning and reference bundle for organizing a complete Pokopia adventure.",
    shortBenefit: "Bring daily planning, event tracking, exploration, building, and reference work into one companion system.",
    benefits: ["Daily Reset System", "Event and Spawn Trackers", "Cloud Islands build planning", "Field Guide and Adventure Dashboard", "US Letter and A4 PDFs"],
    contents: ["6 components", "12 downloadable PDFs", "31 US Letter pages", "31 A4 pages"],
    price: 19.99,
    currency: "USD",
    images: { hero: "/assets/products/pokopia/companion/p16-adventure-companion.png", gallery: ["/assets/products/pokopia/companion/p16-adventure-companion.png"] },
    delivery: { digital: true, formats: ["PDF (A4)", "PDF (US Letter)"], fileCount: 12 },
    commerce: { provider: "stripe", active: Boolean(process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID), stripePriceId: process.env.STRIPE_ADVENTURE_COMPANION_PRICE_ID, stripeLegacyPriceId: process.env.STRIPE_COMPANION_PRICE_ID },
    relatedProductIds: ["P13"],
    bundleIds: [],
    new: true,
    published: true,
  },
  {
    id: "P17",
    slug: "pokopia-completionist-kit",
    name: "Pokopia Completionist Kit",
    game: "Pokopia",
    collection: ["pokopia", "completion-tools"],
    playerTypes: ["collector", "completionist"],
    productType: "bundle",
    description: "A completion-focused reference set combining the Field Guide in US Letter and A4 with the 26-Card Reference Collection.",
    shortBenefit: "Keep useful reference and collection progress together in one focused set.",
    benefits: ["Field Guide quick reference", "Field Guide in US Letter and A4", "26 numbered collection cards", "Focused completion support"],
    contents: ["Field Guide — US Letter PDF", "Field Guide — A4 PDF", "26-Card Reference Collection PDF", "Supporting README"],
    price: 14.99,
    currency: "USD",
    images: { hero: "/assets/products/pokopia/completionist-kit/p17-completionist-kit-hero.png", gallery: ["/assets/products/pokopia/completionist-kit/p17-completionist-kit-included.png", "/assets/products/pokopia/completionist-kit/p17-completionist-kit-preview.png", "/assets/products/pokopia/completionist-kit/p17-completionist-kit-formats.png"] },
    delivery: { digital: true, formats: ["PDF (US Letter)", "PDF (A4)", "Markdown README"], fileCount: 4 },
    commerce: { provider: "stripe", active: Boolean(process.env.STRIPE_P17_STANDALONE_PRICE_ID), stripePriceId: process.env.STRIPE_P17_STANDALONE_PRICE_ID, stripeStandalonePriceId: process.env.STRIPE_P17_STANDALONE_PRICE_ID, stripeUpgradePriceId: process.env.STRIPE_P17_UPGRADE_PRICE_ID },
    relatedProductIds: ["P16"],
    bundleIds: [],
    // P17 is an in-funnel downsell, not a competing public catalog offer.
    // Existing buyers retain their recorded orders and download entitlements.
    published: false,
  },
  {
    // P18 is deliberately unpublished and inactive until its locked 22-file
    // package passes private-storage, entitlement, Stripe, and smoke-test gates.
    id: "P18",
    slug: "pokopia-complete-player-system",
    name: "Pokopia Complete Player System",
    game: "Pokopia",
    collection: ["pokopia", "completion-tools"],
    playerTypes: ["completionist", "collector", "builder"],
    productType: "bundle",
    description: "An integrated Complete Player System for coordinating core Pokopia planning, tracking, reference, and progress tools.",
    contents: ["11 coordinated components", "22 PDFs — one US Letter and one A4 version per component", "43 printable pages in each format"],
    price: 24.99,
    currency: "USD",
    images: {},
    delivery: { digital: true, formats: ["PDF (US Letter)", "PDF (A4)"], fileCount: 22 },
    commerce: { provider: "stripe", active: false },
    relatedProductIds: ["P06", "P16", "P17"],
    bundleIds: [],
    published: false,
  },
  {
    id: "P99",
    slug: "unpublished-development-record",
    name: "Unpublished Development Record",
    game: "Internal",
    collection: ["internal"],
    playerTypes: [],
    productType: "other",
    description: "A fixture for verifying publication filtering.",
    images: {},
    published: false,
  },
];

export const collections: SugarfieldCollection[] = [
  {
    id: "C01",
    slug: "pokopia",
    name: "Pokopia",
    description: "Guides, trackers, planners, and completion tools for Pokopia players.",
    game: "Pokopia",
    productIds: ["P01", "P02", "P03", "P06", "P13", "P16", "P17"],
    published: true,
  },
  {
    id: "C02",
    slug: "building-tools",
    name: "Building Tools",
    description: "Planning sheets and references for players who build with intention.",
    productIds: ["P01"],
    published: true,
  },
  {
    id: "C99",
    slug: "internal",
    name: "Internal Development",
    description: "Unpublished development records.",
    productIds: ["P99"],
    published: false,
  },
];

// Bundles stay empty until their contents, pricing, and Stripe mapping are approved.
export const bundles: SugarfieldBundle[] = [];

export function getPublishedProducts(): SugarfieldProduct[] {
  return products.filter((product) => product.published);
}

export function getProductBySlug(slug: string): SugarfieldProduct | undefined {
  return getPublishedProducts().find((product) => product.slug === slug);
}

export function getPublishedCollections(): SugarfieldCollection[] {
  return collections.filter((collection) => collection.published);
}

export function getCollectionBySlug(slug: string): SugarfieldCollection | undefined {
  return getPublishedCollections().find((collection) => collection.slug === slug);
}

export function getProductsForCollection(slug: string): SugarfieldProduct[] {
  const collection = getCollectionBySlug(slug);
  if (!collection) return [];

  return collection.productIds
    .map((productId) => getPublishedProducts().find((product) => product.id === productId))
    .filter((product): product is SugarfieldProduct => product !== undefined);
}

export function getPublishedBundles(): SugarfieldBundle[] { return bundles.filter((bundle) => bundle.published); }
export function getBundleBySlug(slug: string): SugarfieldBundle | undefined { return getPublishedBundles().find((bundle) => bundle.slug === slug); }
export function getProductsForBundle(slug: string): SugarfieldProduct[] { const bundle = getBundleBySlug(slug); if (!bundle) return []; return bundle.productIds.map((id) => getPublishedProducts().find((product) => product.id === id)).filter((product): product is SugarfieldProduct => product !== undefined); }
