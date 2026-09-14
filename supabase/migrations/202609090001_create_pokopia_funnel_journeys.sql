create table if not exists public.funnel_journeys (
  id uuid primary key default gen_random_uuid(),
  funnel_id text not null default 'pokopia_daily_reset',
  funnel_session_id text,
  quick_start_claimed boolean not null default false,
  daily_reset_viewed boolean not null default false,
  daily_reset_purchased boolean not null default false, daily_reset_skipped boolean not null default false,
  companion_purchased boolean not null default false, companion_skipped boolean not null default false,
  p18_eligible boolean not null default false, p18_bypassed boolean not null default false, p18_viewed boolean not null default false,
  p18_purchased boolean not null default false, p18_skipped boolean not null default false,
  p17_downsell_viewed boolean not null default false, p17_purchased boolean not null default false, p17_skipped boolean not null default false,
  journey_completed boolean not null default false, branch_reason text,
  first_touch_attribution jsonb, current_attribution jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(), journey_id uuid not null references public.funnel_journeys(id),
  event_name text not null, offer_id text, product_id text, funnel_step text, prior_step text, branch text, branch_reason text,
  funnel_session_id text, first_touch_attribution jsonb, current_attribution jsonb,
  value integer, currency text, created_at timestamptz not null default now()
);
create index if not exists funnel_events_journey_idx on public.funnel_events (journey_id, created_at);
alter table public.funnel_journeys enable row level security;
alter table public.funnel_events enable row level security;
