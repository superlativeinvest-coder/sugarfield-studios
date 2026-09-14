alter table public.orders
  add column if not exists provider_event_id text unique,
  add column if not exists payment_intent_id text,
  add column if not exists offer_id text,
  add column if not exists sku text;

update public.orders set sku = product_id where sku is null;

alter table public.orders
  alter column sku set not null;
