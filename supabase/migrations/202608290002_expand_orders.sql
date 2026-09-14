alter table public.orders
  add column if not exists first_touch_attribution jsonb,
  add column if not exists current_touch_attribution jsonb,
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists entitlements jsonb not null default '[]'::jsonb;

alter table public.orders
  drop constraint if exists orders_fulfillment_status_check;

alter table public.orders
  add constraint orders_fulfillment_status_check check (fulfillment_status in ('pending', 'fulfilled', 'failed'));
