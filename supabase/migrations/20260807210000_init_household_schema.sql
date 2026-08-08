create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index members_household_id_idx on public.members (household_id);

create table public.balances (
  household_id uuid primary key references public.households (id) on delete cascade,
  amount numeric(14, 2) not null default 0 check (amount = round(amount, 2)),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.income_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0 and amount = round(amount, 2)),
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  month_day smallint check (month_day is null or month_day between 1 and 28),
  anchor_date date,
  active boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_rules_frequency_params_chk check (
    (frequency = 'monthly' and month_day is not null and weekday is null)
    or (frequency in ('weekly', 'biweekly') and weekday is not null and month_day is null)
  )
);

create index income_rules_household_id_idx on public.income_rules (household_id);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0 and amount = round(amount, 2)),
  planned_date date not null,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'done', 'cancelled')),
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_household_id_idx on public.purchases (household_id);
create index purchases_household_status_idx on public.purchases (household_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

create trigger balances_set_updated_at
before update on public.balances
for each row execute function public.set_updated_at();

create trigger income_rules_set_updated_at
before update on public.income_rules
for each row execute function public.set_updated_at();

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = p_household_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

create or replace function public.generate_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.current_display_name(p_display_name text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(trim(p_display_name), ''),
    nullif(split_part(coalesce((select u.email from auth.users u where u.id = (select auth.uid())), ''), '@', 1), ''),
    'Участник'
  );
$$;

create or replace function public.create_household(p_name text, p_display_name text default null)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_household public.households;
  v_code text;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.members m where m.user_id = v_user_id) then
    raise exception 'Already in a household';
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_invite_code();
    begin
      insert into public.households (name, invite_code)
      values (coalesce(nullif(trim(p_name), ''), 'Наша семья'), v_code)
      returning * into v_household;
      exit;
    exception
      when unique_violation then
        if v_attempts >= 10 then
          raise;
        end if;
    end;
  end loop;

  insert into public.members (user_id, household_id, display_name)
  values (v_user_id, v_household.id, public.current_display_name(p_display_name));

  insert into public.balances (household_id, amount, updated_by)
  values (v_household.id, 0, v_user_id);

  return v_household;
end;
$$;

revoke all on function public.create_household(text, text) from public;
grant execute on function public.create_household(text, text) to authenticated;

create or replace function public.join_household(p_invite_code text, p_display_name text default null)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_household public.households;
  v_code text := upper(trim(p_invite_code));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.members m where m.user_id = v_user_id) then
    raise exception 'Already in a household';
  end if;

  if v_code = '' then
    raise exception 'Invite code required';
  end if;

  select h.*
  into v_household
  from public.households h
  where h.invite_code = v_code;

  if v_household.id is null then
    raise exception 'Household not found';
  end if;

  insert into public.members (user_id, household_id, display_name)
  values (v_user_id, v_household.id, public.current_display_name(p_display_name));

  return v_household;
end;
$$;

revoke all on function public.join_household(text, text) from public;
grant execute on function public.join_household(text, text) to authenticated;

create or replace function public.complete_purchase(p_purchase_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_purchase public.purchases;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.*
  into v_purchase
  from public.purchases p
  where p.id = p_purchase_id
  for update;

  if v_purchase.id is null then
    raise exception 'Purchase not found';
  end if;

  if not public.is_household_member(v_purchase.household_id) then
    raise exception 'Not a household member';
  end if;

  if v_purchase.status <> 'planned' then
    raise exception 'Purchase is not planned';
  end if;

  update public.purchases
  set
    status = 'done',
    updated_by = v_user_id
  where id = v_purchase.id
  returning * into v_purchase;

  update public.balances
  set
    amount = amount - v_purchase.amount,
    updated_by = v_user_id
  where household_id = v_purchase.household_id;

  return v_purchase;
end;
$$;

revoke all on function public.complete_purchase(uuid) from public;
grant execute on function public.complete_purchase(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.balances enable row level security;
alter table public.income_rules enable row level security;
alter table public.purchases enable row level security;

create policy households_select on public.households
for select to authenticated
using (public.is_household_member(id));

create policy members_select on public.members
for select to authenticated
using (public.is_household_member(household_id));

create policy members_update_own on public.members
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy balances_select on public.balances
for select to authenticated
using (public.is_household_member(household_id));

create policy balances_update on public.balances
for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy income_rules_select on public.income_rules
for select to authenticated
using (public.is_household_member(household_id));

create policy income_rules_insert on public.income_rules
for insert to authenticated
with check (public.is_household_member(household_id));

create policy income_rules_update on public.income_rules
for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy income_rules_delete on public.income_rules
for delete to authenticated
using (public.is_household_member(household_id));

create policy purchases_select on public.purchases
for select to authenticated
using (public.is_household_member(household_id));

create policy purchases_insert on public.purchases
for insert to authenticated
with check (
  public.is_household_member(household_id)
  and created_by = (select auth.uid())
);

create policy purchases_update on public.purchases
for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

alter publication supabase_realtime add table public.balances;
alter publication supabase_realtime add table public.purchases;
alter publication supabase_realtime add table public.income_rules;
