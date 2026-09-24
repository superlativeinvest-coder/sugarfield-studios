-- Additive lead and transactional Quick Start delivery state.
-- Customer authentication, paid orders, and entitlements remain separate.
alter table public.funnel_journeys
  add column if not exists lead_email text,
  add column if not exists quick_start_delivery_status text not null default 'pending',
  add column if not exists quick_start_delivery_requested_at timestamptz,
  add column if not exists quick_start_delivery_completed_at timestamptz,
  add column if not exists quick_start_delivery_failed_at timestamptz,
  add column if not exists quick_start_delivery_error text;

create index if not exists funnel_journeys_lead_email_idx
  on public.funnel_journeys (lead_email);

alter table public.funnel_journeys
  drop constraint if exists funnel_journeys_lead_email_lowercase;

alter table public.funnel_journeys
  add constraint funnel_journeys_lead_email_lowercase
  check (lead_email is null or lead_email = lower(lead_email));
