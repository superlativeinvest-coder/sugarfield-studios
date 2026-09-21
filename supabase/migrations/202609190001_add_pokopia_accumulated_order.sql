-- Staging-only additive schema for the canonical Pokopia accumulated order.
-- Legacy tier columns remain intact for backwards compatibility.
alter table public.funnel_journeys
  add column if not exists selected_products jsonb not null default '[]'::jsonb,
  add column if not exists checkout_fingerprint text,
  add column if not exists checkout_fingerprint_version text,
  add column if not exists p18_qualified_view boolean not null default false,
  add column if not exists p17_eligible boolean not null default false;

alter table public.orders
  add column if not exists line_items jsonb not null default '[]'::jsonb;
