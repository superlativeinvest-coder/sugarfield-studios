-- Sugarfield Funnel Analytics — Phase 1 schema and security foundation.
-- Additive staging-first migration. Existing journey, order, entitlement, and
-- legacy funnel-event tables remain authoritative for their current concerns.

alter table public.funnel_journeys
  add column if not exists anonymous_id text;

create index if not exists funnel_journeys_anonymous_id_idx
  on public.funnel_journeys (anonymous_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null default gen_random_uuid(),
  event_name text not null,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),

  journey_id uuid references public.funnel_journeys(id) on delete set null,
  anonymous_id text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,

  source text,
  medium text,
  campaign text,
  content_id text,
  term text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  ttclid text,

  landing_page text,
  page_path text,
  referrer text,
  funnel_step text,
  previous_step text,

  product_id text,
  product_price_cents integer,
  selected_products jsonb,
  cart_value_cents integer,

  order_id uuid references public.orders(id) on delete set null,
  revenue_cents integer,
  currency text not null default 'USD',

  device_type text,
  browser text,
  os text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint analytics_events_event_id_unique unique (event_id),
  constraint analytics_events_currency_uppercase check (currency = upper(currency)),
  constraint analytics_events_nonnegative_money check (
    (product_price_cents is null or product_price_cents >= 0)
    and (cart_value_cents is null or cart_value_cents >= 0)
    and (revenue_cents is null or revenue_cents >= 0)
  )
);

comment on table public.analytics_events is
  'Normalized first-party funnel observations. Transactional tables remain authoritative.';
comment on column public.analytics_events.order_id is
  'Canonical public.orders.id from the Stripe-confirmed order flow; never a Stripe session/event identifier.';

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);
create index if not exists analytics_events_journey_id_idx
  on public.analytics_events (journey_id);
create index if not exists analytics_events_anonymous_id_idx
  on public.analytics_events (anonymous_id);
create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at);
create index if not exists analytics_events_content_id_idx
  on public.analytics_events (content_id);
create index if not exists analytics_events_order_id_idx
  on public.analytics_events (order_id);
create index if not exists analytics_events_utm_source_idx
  on public.analytics_events (utm_source);
create index if not exists analytics_events_utm_campaign_idx
  on public.analytics_events (utm_campaign);
create index if not exists analytics_events_utm_content_idx
  on public.analytics_events (utm_content);
create index if not exists analytics_events_ttclid_idx
  on public.analytics_events (ttclid);

-- Stripe/webhook retries and completion-page refreshes must never create a
-- second purchase observation for the same canonical order.
create unique index if not exists analytics_events_purchase_order_unique_idx
  on public.analytics_events (order_id)
  where event_name = 'purchase_completed' and order_id is not null;

-- The server endpoint is the only future insert boundary. No browser role can
-- read, insert, update, or delete analytics rows directly. The service-role
-- server client bypasses RLS and is granted view access explicitly below.
alter table public.analytics_events enable row level security;
alter table public.funnel_journeys enable row level security;

revoke all on table public.analytics_events from public, anon, authenticated;

create or replace view public.analytics_funnel_step_summary
with (security_invoker = true)
as
select
  event_name,
  count(distinct journey_id) as unique_journeys,
  count(*) as event_count
from public.analytics_events
group by event_name;

create or replace view public.analytics_product_decision_summary
with (security_invoker = true)
as
select
  product_id,
  count(*) filter (where event_name like 'p%_viewed') as views,
  count(*) filter (where event_name like 'p%_buy_clicked') as buy_clicks,
  count(*) filter (where event_name like 'p%_skipped') as skips,
  round(
    100.0 * count(*) filter (where event_name like 'p%_buy_clicked')
    / nullif(count(*) filter (where event_name like 'p%_viewed'), 0),
    2
  ) as buy_rate,
  round(
    100.0 * count(*) filter (where event_name like 'p%_skipped')
    / nullif(count(*) filter (where event_name like 'p%_viewed'), 0),
    2
  ) as skip_rate
from public.analytics_events
where product_id is not null
group by product_id;

create or replace view public.analytics_content_attribution_summary
with (security_invoker = true)
as
with content_events as (
  select
    coalesce(content_id, utm_content) as content_id,
    event_name,
    journey_id,
    anonymous_id,
    user_id,
    order_id,
    revenue_cents
  from public.analytics_events
  where coalesce(content_id, utm_content) is not null
), visitors as (
  select
    content_id,
    count(distinct coalesce(anonymous_id, journey_id::text)) as visitors
  from content_events
  group by content_id
), aggregates as (
  select
    content_id,
    count(distinct journey_id) filter (where event_name = 'email_submitted') as email_captures,
    count(distinct journey_id) filter (where event_name = 'p06_buy_clicked') as p06_buys,
    count(distinct journey_id) filter (where event_name = 'p16_buy_clicked') as p16_buys,
    count(distinct journey_id) filter (where event_name = 'p18_buy_clicked') as p18_buys,
    count(distinct journey_id) filter (where event_name = 'p17_buy_clicked') as p17_buys,
    count(distinct coalesce(user_id::text, order_id::text)) filter (where event_name = 'purchase_completed') as customers,
    count(distinct order_id) filter (where event_name = 'purchase_completed') as orders,
    coalesce(sum(revenue_cents) filter (where event_name = 'purchase_completed'), 0) as revenue
  from content_events
  group by content_id
)
select
  aggregates.content_id,
  visitors.visitors,
  aggregates.email_captures,
  aggregates.p06_buys,
  aggregates.p16_buys,
  aggregates.p18_buys,
  aggregates.p17_buys,
  aggregates.customers,
  aggregates.orders,
  aggregates.revenue,
  round(aggregates.revenue::numeric / nullif(visitors.visitors, 0), 2) as revenue_per_visitor
from aggregates
join visitors using (content_id);

create or replace view public.analytics_campaign_summary
with (security_invoker = true)
as
with campaign_events as (
  select
    coalesce(source, utm_source, 'direct') as source,
    coalesce(medium, utm_medium, 'none') as medium,
    coalesce(campaign, utm_campaign, 'none') as campaign,
    event_name,
    journey_id,
    anonymous_id,
    user_id,
    order_id,
    revenue_cents
  from public.analytics_events
), aggregates as (
  select
    source,
    medium,
    campaign,
    count(distinct coalesce(anonymous_id, journey_id::text)) as visitors,
    count(distinct coalesce(user_id::text, order_id::text)) filter (where event_name = 'purchase_completed') as customers,
    count(distinct order_id) filter (where event_name = 'purchase_completed') as orders,
    coalesce(sum(revenue_cents) filter (where event_name = 'purchase_completed'), 0) as revenue
  from campaign_events
  group by source, medium, campaign
)
select
  source,
  medium,
  campaign,
  visitors,
  customers,
  orders,
  revenue,
  round(100.0 * customers / nullif(visitors, 0), 2) as conversion_rate
from aggregates;

revoke all on table public.analytics_funnel_step_summary from public, anon, authenticated;
revoke all on table public.analytics_product_decision_summary from public, anon, authenticated;
revoke all on table public.analytics_content_attribution_summary from public, anon, authenticated;
revoke all on table public.analytics_campaign_summary from public, anon, authenticated;

grant select on table
  public.analytics_funnel_step_summary,
  public.analytics_product_decision_summary,
  public.analytics_content_attribution_summary,
  public.analytics_campaign_summary
to service_role;
