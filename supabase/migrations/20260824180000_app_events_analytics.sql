create table public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint app_events_name_chk check (name in (
    'screen_view',
    'session_start',
    'form_opened',
    'form_submitted',
    'form_dismissed',
    'purchase_projection_refused',
    'transfer_suggestion_clicked',
    'tour_completed',
    'tour_skipped',
    'pwa_installed',
    'parse_line_shown',
    'parse_line_applied',
    'stats_advice_opened',
    'sync_error',
    'sync_retry'
  )),
  constraint app_events_props_obj_chk check (jsonb_typeof(props) = 'object')
);

create index app_events_created_at_idx on public.app_events (created_at desc);
create index app_events_name_created_at_idx on public.app_events (name, created_at desc);
create index app_events_user_id_created_at_idx on public.app_events (user_id, created_at desc);

alter table public.app_events enable row level security;

create policy app_events_insert_own on public.app_events
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy app_events_select_own on public.app_events
for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.app_events from public, anon;
grant select, insert on public.app_events to authenticated;

create schema if not exists analytics;

revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to postgres, service_role;

create or replace view analytics.kpis
with (security_invoker = false)
as
with writers as (
  select created_by as user_id, created_at
  from public.transactions
  where created_by is not null
    and status = 'posted'
),
first_write as (
  select user_id, min(created_at) as first_at
  from writers
  group by user_id
),
cohort_7d as (
  select u.id as user_id, u.created_at
  from auth.users u
  where u.created_at >= now() - interval '7 days'
),
events_7d as (
  select name, props, user_id
  from public.app_events
  where created_at >= now() - interval '7 days'
)
select
  (select count(*)::int from public.profiles) as users_total,
  (select count(*)::int from cohort_7d) as new_users_7d,
  (select count(distinct user_id)::int from writers where created_at >= now() - interval '1 day') as writers_1d,
  (select count(distinct user_id)::int from writers where created_at >= now() - interval '7 days') as writers_7d,
  (select count(distinct user_id)::int from writers where created_at >= now() - interval '30 days') as writers_30d,
  (
    select count(*)::int
    from cohort_7d c
    join first_write f on f.user_id = c.user_id
    where f.first_at <= c.created_at + interval '1 day'
  ) as activated_7d,
  round(
    100.0 * (
      select count(*)
      from cohort_7d c
      join first_write f on f.user_id = c.user_id
      where f.first_at <= c.created_at + interval '1 day'
    ) / nullif((select count(*) from cohort_7d), 0),
    1
  ) as activation_rate_7d,
  (
    select count(distinct f.user_id)::int
    from first_write f
    join writers w on w.user_id = f.user_id
    where (timezone('Europe/Moscow', w.created_at))::date
      = (timezone('Europe/Moscow', f.first_at))::date + 1
  ) as retained_d1,
  (
    select count(distinct ir.updated_by)::int
    from public.income_rules ir
    where ir.active and ir.updated_by is not null
  ) as users_with_income_rule,
  (
    select count(distinct er.updated_by)::int
    from public.expense_rules er
    where er.active and er.updated_by is not null
  ) as users_with_expense_rule,
  (
    select count(distinct p.created_by)::int
    from public.purchases p
    where p.status = 'planned' and p.created_by is not null
  ) as users_with_planned_purchase,
  (
    select count(distinct g.created_by)::int
    from public.savings_goals g
    where g.status = 'active' and g.created_by is not null
  ) as users_with_savings_goal,
  (
    select count(distinct t.user_id)::int
    from public.operation_templates t
  ) as users_with_template,
  (
    select count(distinct m.user_id)::int
    from public.account_members m
    where m.account_id in (
      select account_id
      from public.account_members
      group by account_id
      having count(*) > 1
    )
  ) as users_on_shared_account,
  (select count(*)::int from events_7d where name = 'session_start') as sessions_7d,
  (
    select count(*)::int
    from events_7d
    where name = 'session_start' and props ->> 'standalone' = 'true'
  ) as pwa_sessions_7d,
  (select count(*)::int from events_7d where name = 'form_opened') as forms_opened_7d,
  (select count(*)::int from events_7d where name = 'form_submitted') as forms_submitted_7d,
  round(
    100.0 * (select count(*) from events_7d where name = 'form_submitted')
    / nullif((select count(*) from events_7d where name = 'form_opened'), 0),
    1
  ) as form_submit_rate_7d;

create or replace view analytics.event_counts_daily
with (security_invoker = false)
as
select
  (timezone('Europe/Moscow', created_at))::date as day,
  name,
  count(*)::int as events,
  count(distinct user_id)::int as users
from public.app_events
group by 1, 2;

create or replace view analytics.writers_daily
with (security_invoker = false)
as
select
  (timezone('Europe/Moscow', created_at))::date as day,
  count(*)::int as operations,
  count(distinct created_by)::int as writers
from public.transactions
where created_by is not null
  and status = 'posted'
group by 1;

revoke all on analytics.kpis from public, anon, authenticated;
revoke all on analytics.event_counts_daily from public, anon, authenticated;
revoke all on analytics.writers_daily from public, anon, authenticated;
grant select on analytics.kpis to postgres, service_role;
grant select on analytics.event_counts_daily to postgres, service_role;
grant select on analytics.writers_daily to postgres, service_role;
