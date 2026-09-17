-- Staging-first, additive migration. Rollback: drop the column after reverting
-- code that uses optimistic journey updates.
alter table public.funnel_journeys
  add column if not exists journey_version integer not null default 0;
