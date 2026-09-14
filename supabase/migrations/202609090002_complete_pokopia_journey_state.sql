alter table public.funnel_journeys add column if not exists funnel_session_id text;
alter table public.funnel_journeys add column if not exists quick_start_claimed boolean not null default false;
alter table public.funnel_journeys add column if not exists daily_reset_viewed boolean not null default false;
alter table public.funnel_journeys add column if not exists companion_viewed boolean not null default false;
alter table public.funnel_journeys add column if not exists completed_at timestamptz;
alter table public.funnel_journeys add column if not exists current_attribution jsonb;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'funnel_journeys' and column_name = 'current_touch_attribution'
  ) then
    execute 'update public.funnel_journeys set current_attribution = coalesce(current_attribution, current_touch_attribution) where current_attribution is null';
  end if;
end $$;
alter table public.funnel_events add column if not exists branch_reason text;
alter table public.funnel_events add column if not exists funnel_session_id text;
alter table public.funnel_events add column if not exists first_touch_attribution jsonb;
alter table public.funnel_events add column if not exists current_attribution jsonb;
