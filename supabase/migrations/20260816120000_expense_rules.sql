alter table public.transactions drop constraint if exists transactions_source_check;

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.transactions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%'
    and pg_get_constraintdef(oid) ilike '%income_rule%';
  if cname is not null then
    execute format('alter table public.transactions drop constraint %I', cname);
  end if;
end $$;

alter table public.transactions
  add constraint transactions_source_check
  check (source in ('manual', 'income_rule', 'purchase', 'expense_rule'));

create table public.expense_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0 and amount = round(amount, 2)),
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  month_day smallint check (month_day is null or month_day between 1 and 28),
  anchor_date date,
  title text,
  category_id uuid references public.categories (id) on delete set null,
  starts_on date not null default current_date,
  active boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_rules_frequency_params_chk check (
    (frequency = 'monthly' and month_day is not null and weekday is null)
    or (frequency in ('weekly', 'biweekly') and weekday is not null and month_day is null)
  )
);

create index expense_rules_account_id_idx on public.expense_rules (account_id);

create table public.expense_occurrences (
  id uuid primary key default gen_random_uuid(),
  expense_rule_id uuid not null references public.expense_rules (id) on delete cascade,
  occurred_on date not null,
  status text not null check (status in ('posted', 'skipped', 'adjusted')),
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (expense_rule_id, occurred_on)
);

create trigger expense_rules_set_updated_at
before update on public.expense_rules
for each row execute function public.set_updated_at();

alter table public.expense_rules enable row level security;
alter table public.expense_occurrences enable row level security;

create policy expense_rules_select on public.expense_rules
for select to authenticated
using (public.is_account_member(account_id));

create policy expense_rules_insert on public.expense_rules
for insert to authenticated
with check (public.is_account_member(account_id));

create policy expense_rules_update on public.expense_rules
for update to authenticated
using (public.is_account_member(account_id))
with check (public.is_account_member(account_id));

create policy expense_rules_delete on public.expense_rules
for delete to authenticated
using (public.is_account_member(account_id));

create policy expense_occurrences_select on public.expense_occurrences
for select to authenticated
using (
  exists (
    select 1 from public.expense_rules er
    where er.id = expense_rule_id and public.is_account_member(er.account_id)
  )
);

alter table public.expense_rules replica identity full;
alter table public.expense_occurrences replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.expense_rules;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.expense_occurrences;
exception when duplicate_object then null;
end $$;

create or replace function public.apply_due_expense_rules(p_as_of date default current_date)
returns setof public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.expense_rules;
  v_date date;
  v_tx public.transactions;
  v_cat_id uuid;
  v_cat_name text;
  v_cat_color text;
  v_cat_icon text;
  v_inserted uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  for v_rule in
    select er.*
    from public.expense_rules er
    where er.active
      and public.is_account_member(er.account_id)
  loop
    perform 1 from public.accounts where id = v_rule.account_id for update;
    v_cat_id := null;
    v_cat_name := null;
    v_cat_color := null;
    v_cat_icon := null;
    if v_rule.category_id is not null then
      select c.id, c.name, c.color, c.icon
      into v_cat_id, v_cat_name, v_cat_color, v_cat_icon
      from public.categories c
      where c.id = v_rule.category_id;
    end if;

    for v_date in
      select d
      from public.income_rule_due_dates(
        v_rule.frequency,
        v_rule.weekday,
        v_rule.month_day,
        v_rule.anchor_date,
        v_rule.starts_on,
        p_as_of
      ) as d
    loop
      insert into public.expense_occurrences (expense_rule_id, occurred_on, status)
      values (v_rule.id, v_date, 'posted')
      on conflict (expense_rule_id, occurred_on) do nothing
      returning id into v_inserted;

      if v_inserted is null then
        continue;
      end if;

      insert into public.transactions (
        account_id, kind, status, source, category_id, category_name, category_color, category_icon,
        title, amount, occurred_on, created_by, updated_by
      )
      values (
        v_rule.account_id, 'expense', 'posted', 'expense_rule',
        v_cat_id, v_cat_name, v_cat_color, v_cat_icon,
        coalesce(nullif(trim(v_rule.title), ''), 'Регулярный расход'),
        v_rule.amount, v_date, v_user_id, v_user_id
      )
      returning * into v_tx;

      update public.expense_occurrences
      set transaction_id = v_tx.id
      where id = v_inserted;

      update public.accounts
      set amount = amount - v_rule.amount, updated_by = v_user_id
      where id = v_rule.account_id;

      return next v_tx;
    end loop;
  end loop;
end;
$$;

revoke all on function public.apply_due_expense_rules(date) from public;
grant execute on function public.apply_due_expense_rules(date) to authenticated;

create or replace function public.skip_expense_occurrence(p_occurrence_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_occ public.expense_occurrences;
  v_tx public.transactions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_occ from public.expense_occurrences where id = p_occurrence_id for update;
  if v_occ.id is null then
    raise exception 'Occurrence not found';
  end if;

  if v_occ.transaction_id is not null then
    select * into v_tx from public.transactions where id = v_occ.transaction_id for update;
    if v_tx.id is not null then
      if not public.is_account_member(v_tx.account_id) then
        raise exception 'Not an account member';
      end if;
      if v_tx.status = 'posted' then
        update public.accounts
        set amount = amount + v_tx.amount, updated_by = v_user_id
        where id = v_tx.account_id;
        update public.transactions
        set status = 'cancelled', updated_by = v_user_id
        where id = v_tx.id;
      end if;
    end if;
  else
    if not exists (
      select 1 from public.expense_rules er
      where er.id = v_occ.expense_rule_id and public.is_account_member(er.account_id)
    ) then
      raise exception 'Not an account member';
    end if;
  end if;

  update public.expense_occurrences
  set status = 'skipped'
  where id = p_occurrence_id;
end;
$$;

revoke all on function public.skip_expense_occurrence(uuid) from public;
grant execute on function public.skip_expense_occurrence(uuid) to authenticated;

create or replace function public.adjust_expense_occurrence(p_occurrence_id uuid, p_new_amount numeric)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_occ public.expense_occurrences;
  v_tx public.transactions;
  v_amount numeric(14, 2) := round(p_new_amount, 2);
  v_delta numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_occ from public.expense_occurrences where id = p_occurrence_id for update;
  if v_occ.id is null or v_occ.transaction_id is null then
    raise exception 'Occurrence not found';
  end if;

  select * into v_tx from public.transactions where id = v_occ.transaction_id for update;
  if v_tx.id is null then
    raise exception 'Occurrence not found';
  end if;

  if not public.is_account_member(v_tx.account_id) then
    raise exception 'Not an account member';
  end if;

  if v_tx.status <> 'posted' then
    raise exception 'Occurrence not found';
  end if;

  v_delta := v_amount - v_tx.amount;
  update public.accounts
  set amount = amount - v_delta, updated_by = v_user_id
  where id = v_tx.account_id;

  update public.transactions
  set amount = v_amount, updated_by = v_user_id
  where id = v_tx.id
  returning * into v_tx;

  update public.expense_occurrences
  set status = 'adjusted'
  where id = p_occurrence_id;

  return v_tx;
end;
$$;

revoke all on function public.adjust_expense_occurrence(uuid, numeric) from public;
grant execute on function public.adjust_expense_occurrence(uuid, numeric) to authenticated;

create or replace function public.update_posted_transaction(
  p_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_occurred_on date,
  p_counterparty_account_id uuid default null,
  p_category_id uuid default null,
  p_title text default null,
  p_notes text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tx public.transactions;
  v_amount numeric(14, 2) := round(p_amount, 2);
  v_account_id uuid := p_account_id;
  v_counterparty_id uuid := p_counterparty_account_id;
  v_occurred_on date := p_occurred_on;
  v_category_name text;
  v_category_color text;
  v_category_icon text;
  v_category_kind text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_tx from public.transactions where id = p_id for update;
  if v_tx.id is null or v_tx.status <> 'posted' then
    raise exception 'Transaction not found';
  end if;

  if not public.is_account_member(v_tx.account_id)
    or (v_tx.counterparty_account_id is not null and not public.is_account_member(v_tx.counterparty_account_id))
  then
    raise exception 'Not an account member';
  end if;

  if v_tx.source in ('income_rule', 'expense_rule') then
    v_account_id := v_tx.account_id;
    v_counterparty_id := null;
    v_occurred_on := v_tx.occurred_on;
  end if;

  if v_tx.kind = 'transfer' then
    if v_counterparty_id is null or v_account_id = v_counterparty_id then
      raise exception 'Choose different accounts';
    end if;
  else
    v_counterparty_id := null;
  end if;

  if not public.is_account_member(v_account_id)
    or (v_counterparty_id is not null and not public.is_account_member(v_counterparty_id))
  then
    raise exception 'Not an account member';
  end if;

  perform 1
  from public.accounts a
  where a.id = any(array[v_tx.account_id, v_tx.counterparty_account_id, v_account_id, v_counterparty_id])
  order by a.id
  for update;

  if p_category_id is not null then
    if not public.is_category_visible(p_category_id) then
      raise exception 'Category not found';
    end if;
    select name, color, icon, kind
    into v_category_name, v_category_color, v_category_icon, v_category_kind
    from public.categories
    where id = p_category_id;
    if v_tx.kind in ('expense', 'income') and v_category_kind is distinct from v_tx.kind then
      raise exception 'Category not found';
    end if;
  end if;

  perform public.apply_posted_balance(
    v_tx.kind, v_tx.account_id, v_tx.counterparty_account_id, v_tx.amount, v_user_id, -1
  );
  perform public.apply_posted_balance(
    v_tx.kind, v_account_id, v_counterparty_id, v_amount, v_user_id, 1
  );

  update public.transactions
  set
    account_id = v_account_id,
    counterparty_account_id = v_counterparty_id,
    amount = v_amount,
    occurred_on = v_occurred_on,
    title = nullif(trim(p_title), ''),
    notes = nullif(trim(p_notes), ''),
    category_id = case
      when v_tx.kind = 'transfer' then null
      when p_category_id is not null then p_category_id
      else v_tx.category_id
    end,
    category_name = case
      when v_tx.kind = 'transfer' then null
      when p_category_id is not null then v_category_name
      else v_tx.category_name
    end,
    category_color = case
      when v_tx.kind = 'transfer' then null
      when p_category_id is not null then v_category_color
      else v_tx.category_color
    end,
    category_icon = case
      when v_tx.kind = 'transfer' then null
      when p_category_id is not null then v_category_icon
      else v_tx.category_icon
    end,
    updated_by = v_user_id
  where id = v_tx.id
  returning * into v_tx;

  if v_tx.source = 'income_rule' then
    update public.income_occurrences
    set status = 'adjusted'
    where transaction_id = v_tx.id;
  end if;

  if v_tx.source = 'expense_rule' then
    update public.expense_occurrences
    set status = 'adjusted'
    where transaction_id = v_tx.id;
  end if;

  return v_tx;
end;
$$;

create or replace function public.cancel_posted_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tx public.transactions;
  v_occ_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_tx from public.transactions where id = p_id for update;
  if v_tx.id is null or v_tx.status <> 'posted' then
    raise exception 'Transaction not found';
  end if;

  if not public.is_account_member(v_tx.account_id)
    or (v_tx.counterparty_account_id is not null and not public.is_account_member(v_tx.counterparty_account_id))
  then
    raise exception 'Not an account member';
  end if;

  if v_tx.source = 'income_rule' then
    select id into v_occ_id from public.income_occurrences where transaction_id = v_tx.id;
    if v_occ_id is not null then
      perform public.skip_income_occurrence(v_occ_id);
      return;
    end if;
  end if;

  if v_tx.source = 'expense_rule' then
    select id into v_occ_id from public.expense_occurrences where transaction_id = v_tx.id;
    if v_occ_id is not null then
      perform public.skip_expense_occurrence(v_occ_id);
      return;
    end if;
  end if;

  perform 1
  from public.accounts a
  where a.id = any(array[v_tx.account_id, v_tx.counterparty_account_id])
  order by a.id
  for update;

  perform public.apply_posted_balance(
    v_tx.kind, v_tx.account_id, v_tx.counterparty_account_id, v_tx.amount, v_user_id, -1
  );

  update public.transactions
  set status = 'cancelled', updated_by = v_user_id
  where id = v_tx.id;
end;
$$;

revoke execute on function public.apply_due_expense_rules(date) from anon, public;
revoke execute on function public.skip_expense_occurrence(uuid) from anon, public;
revoke execute on function public.adjust_expense_occurrence(uuid, numeric) from anon, public;
