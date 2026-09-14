# Sugarfield Studio Next Milestones

This roadmap follows the completed homepage and catalog foundation. Each milestone should be implemented and verified as its own checkpoint.

## M1 — Homepage + Catalog Foundation

- **Objective:** Maintain the public homepage, centralized product truth, collection routes, catalog cards, responsive shell, attribution capture, and commerce boundary.
- **Dependencies:** Approved product artwork and product records for production launch.
- **Files likely affected:** `app/`, `components/`, `lib/catalog/`, `lib/attribution/`, `lib/analytics/`.
- **Tests:** Responsive layout, accessibility, route smoke tests, catalog filtering, attribution persistence, lint, typecheck, and build.
- **Completion criteria:** Homepage and catalog are populated only from approved product truth and pass production QA.

## M2 — Product Funnel Template

- **Objective:** Turn the product route into a reusable sales template with gallery, contents, benefits, details, FAQs, related products, and a purchase CTA.
- **Dependencies:** M1 and approved product-specific content/assets.
- **Files likely affected:** `app/products/[slug]/`, `components/catalog/`, `lib/catalog/`.
- **Tests:** Product rendering, missing optional fields, related-product exclusions, keyboard navigation, metadata, and mobile layouts.
- **Completion criteria:** One configured product renders a complete reusable funnel without duplicated product facts.

## M3 — Stripe Checkout

- **Objective:** Create Stripe Checkout Sessions from validated internal product IDs and configured Stripe Price IDs.
- **Dependencies:** M2, Stripe account, server secrets, and active product-price mapping.
- **Files likely affected:** `app/api/checkout/`, `lib/commerce/`, `.env.example`.
- **Tests:** Validation, inactive products, arbitrary-price rejection, Stripe failure handling, redirect behavior, and secret isolation.
- **Completion criteria:** A valid configured product reaches Stripe Checkout without trusting browser pricing.

## M4 — Stripe Webhook + Order Model

- **Objective:** Make verified Stripe webhook events authoritative and create idempotent orders.
- **Dependencies:** M3, webhook endpoint, database/storage choice, and Stripe signing secret.
- **Files likely affected:** `app/api/stripe/webhook/`, `lib/commerce/`, order storage modules.
- **Tests:** Signature verification, retries, duplicate events, failed payments, malformed payloads, and no sensitive logging.
- **Completion criteria:** Successful payment creates exactly one durable order from a verified webhook. The current repository has the verified webhook and idempotency boundary, but no durable storage adapter yet.

## M5 — Secure Digital Delivery

- **Objective:** Grant entitlements and provide short-lived secure access to purchased files.
- **Dependencies:** M4, private file storage, approved PDFs/assets, and entitlement model.
- **Files likely affected:** `app/orders/`, `lib/delivery/`, storage integration modules.
- **Tests:** Authorization, expired links, revoked access, unauthorized order IDs, replay handling, and download events.
- **Completion criteria:** Customers can access purchased files without permanent public PDF URLs. The current repository has the entitlement/download contracts and protected endpoint boundary, but no storage, authentication, or entitlement adapter yet.

## M6 — Customer Library

- **Objective:** Provide authenticated customers with their purchased products and secure access links.
- **Dependencies:** M4–M5 and an authentication/account approach.
- **Files likely affected:** `app/library/`, account components, order and entitlement modules.
- **Tests:** Authentication, empty library, multiple orders, access control, responsive layout, and sign-out behavior.
- **Completion criteria:** A customer can reliably find every entitled product in one library. The current repository has the protected API boundary and typed repository contracts, but no identity provider or durable library storage adapter yet.

## M7 — Related Product / Y-Funnel

- **Objective:** Offer explicit related products or bundles after purchase using configured relationships only.
- **Dependencies:** M2, M4, M5, and populated `relatedProductIds`/`bundleIds`.
- **Files likely affected:** order confirmation routes, `components/catalog/`, analytics modules.
- **Tests:** No self-offers, no duplicate offers, accept/decline events, no prechecked paid options, and empty relationship handling.
- **Completion criteria:** Post-purchase offers are explicit, relevant, optional, and data-driven. The current repository has the relationship resolver and protected route boundary, but no verified-order or authenticated-customer adapter yet.

## M8 — Bundle System

- **Objective:** Model bundle contents, pricing, product relationships, and bundle-specific purchase flows.
- **Dependencies:** M3–M5 and approved bundle truth.
- **Files likely affected:** `lib/catalog/`, `lib/commerce/`, `app/bundles/`, product data source.
- **Tests:** Bundle composition, price validation, entitlement expansion, unavailable products, and metadata.
- **Completion criteria:** Configured bundles purchase and fulfill as one coherent product experience. The current repository has the typed bundle model, composition helpers, safe empty state, and configured-slug route, but no bundle records or Stripe mappings yet.

## M9 — Full Product Catalog Migration

- **Objective:** Migrate the planned catalog in batches using stable IDs and approved source truth.
- **Dependencies:** M1–M8, product inventory, artwork, PDFs, pricing, and review process.
- **Files likely affected:** catalog data source, asset storage, collection configuration, import tooling.
- **Tests:** Import validation, duplicate IDs/slugs, unpublished records, missing assets, route generation, and performance.
- **Completion criteria:** Every approved product has one canonical route and no invented facts.

## M10 — Email + Customer Lifecycle

- **Objective:** Connect an approved email provider for consented signup and relevant customer lifecycle messages.
- **Dependencies:** Provider selection, privacy/legal review, M3–M6 customer/order events.
- **Files likely affected:** `components/home/EmailSignup.tsx`, `app/api/`, `lib/analytics/`, email integration modules.
- **Tests:** Validation, consent, provider errors, duplicate signup handling, unsubscribe flow, and sensitive-data boundaries.
- **Completion criteria:** Signup submissions are delivered to the selected provider or clearly surfaced as failed; no submissions are silently discarded. The current repository has server/client validation and a provider boundary, but no provider is connected yet.
