export const productTypes = [
  "guide",
  "tracker",
  "planner",
  "checklist",
  "poster",
  "bookmark",
  "cards",
  "bundle",
  "other",
] as const;

export type ProductType = (typeof productTypes)[number];

export type ProductImageSet = {
  hero?: string;
  gallery?: string[];
};

export type ProductDelivery = {
  digital: boolean;
  formats?: string[];
  fileCount?: number;
};

export type ProductCommerce = {
  provider?: "stripe";
  stripeProductId?: string;
  stripePriceId?: string;
  stripeLegacyPriceId?: string;
  stripeStandalonePriceId?: string;
  stripeUpgradePriceId?: string;
  active?: boolean;
};

export type SugarfieldProduct = {
  id: string;
  slug: string;
  name: string;
  game: string;
  collection: string[];
  playerTypes: string[];
  productType: ProductType;
  description: string;
  shortBenefit?: string;
  benefits?: string[];
  contents?: string[];
  faq?: { question: string; answer: string }[];
  price?: number;
  currency?: "USD";
  images: ProductImageSet;
  delivery?: ProductDelivery;
  commerce?: ProductCommerce;
  relatedProductIds?: string[];
  bundleIds?: string[];
  featured?: boolean;
  new?: boolean;
  published: boolean;
};

export type SugarfieldCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  game?: string;
  productIds: string[];
  image?: string;
  published: boolean;
};

export type SugarfieldBundle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  productIds: string[];
  price?: number;
  currency?: "USD";
  commerce?: ProductCommerce;
  published: boolean;
};
