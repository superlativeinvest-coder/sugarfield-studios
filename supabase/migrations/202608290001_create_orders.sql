create table if not exists public.orders (
  id uuid primary key,
  provider text not null check (provider = 'stripe'),
  provider_session_id text not null unique,
  provider_event_id text unique,
  payment_intent_id text,
  product_id text not null,
  offer_id text,
  sku text not null,
  status text not null check (status = 'paid'),
  amount_total integer,
  currency text,
  customer_email text,
  funnel_id text,
  funnel_step text,
  funnel_session text,
  first_touch_attribution jsonb,
  current_touch_attribution jsonb,
  fulfillment_status text not null default 'pending' check (fulfillment_status in ('pending', 'fulfilled', 'failed')),
  entitlements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null
);

alter table public.orders enable row level security;
