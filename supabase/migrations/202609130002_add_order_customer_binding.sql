alter table public.orders add column if not exists customer_id uuid references auth.users(id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
alter table public.funnel_journeys add column if not exists customer_id uuid references auth.users(id);
create index if not exists funnel_journeys_customer_id_idx on public.funnel_journeys (customer_id);
