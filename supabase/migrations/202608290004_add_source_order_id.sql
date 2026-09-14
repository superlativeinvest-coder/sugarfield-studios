alter table public.orders
  add column if not exists source_order_id uuid;

create index if not exists orders_source_order_id_idx
  on public.orders (source_order_id);
