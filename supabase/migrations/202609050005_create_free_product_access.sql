create table if not exists public.free_product_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id text not null,
  sku text not null,
  funnel_session text,
  first_touch_attribution jsonb,
  current_touch_attribution jsonb,
  access_granted_at timestamptz not null default now(),
  access_token_hash text not null,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, product_id),
  constraint free_product_access_email_lowercase check (email = lower(email))
);

create index if not exists free_product_access_token_hash_idx
  on public.free_product_access (access_token_hash);

alter table public.free_product_access enable row level security;
