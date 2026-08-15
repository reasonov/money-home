create or replace function public.income_rule_due_dates(
  p_frequency text,
  p_weekday smallint,
  p_month_day smallint,
  p_anchor_date date,
  p_from date,
  p_to date
)
returns setof date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_date date;
  v_shift integer;
  v_cursor date;
begin
  if p_from is null or p_to is null or p_from > p_to then
    return;
  end if;

  if p_frequency = 'weekly' and p_weekday is not null then
    v_cursor := p_from;
    while v_cursor <= p_to loop
      if extract(dow from v_cursor)::integer = p_weekday then
        return next v_cursor;
      end if;
      v_cursor := v_cursor + 1;
    end loop;
    return;
  end if;

  if p_frequency = 'monthly' and p_month_day is not null then
    v_cursor := date_trunc('month', p_from)::date;
    while v_cursor <= p_to loop
      v_date := make_date(extract(year from v_cursor)::integer, extract(month from v_cursor)::integer, p_month_day);
      if v_date >= p_from and v_date <= p_to then
        return next v_date;
      end if;
      v_cursor := (v_cursor + interval '1 month')::date;
    end loop;
    return;
  end if;

  if p_frequency = 'biweekly' and p_anchor_date is not null then
    v_date := p_anchor_date;
    if v_date < p_from then
      v_shift := ceil((p_from - v_date)::numeric / 14)::integer * 14;
      v_date := v_date + v_shift;
    end if;
    while v_date <= p_to loop
      if v_date >= p_from then
        return next v_date;
      end if;
      v_date := v_date + 14;
    end loop;
  end if;
end;
$$;

revoke all on function public.income_rule_due_dates(text, smallint, smallint, date, date, date) from public;
grant execute on function public.income_rule_due_dates(text, smallint, smallint, date, date, date) to authenticated;

create or replace function public.apply_due_income_rules(p_as_of date default current_date)
returns setof public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.income_rules;
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
    select ir.*
    from public.income_rules ir
    where ir.active
      and public.is_account_member(ir.account_id)
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
      insert into public.income_occurrences (income_rule_id, occurred_on, status)
      values (v_rule.id, v_date, 'posted')
      on conflict (income_rule_id, occurred_on) do nothing
      returning id into v_inserted;

      if v_inserted is null then
        continue;
      end if;

      insert into public.transactions (
        account_id, kind, status, source, category_id, category_name, category_color, category_icon,
        title, amount, occurred_on, created_by, updated_by
      )
      values (
        v_rule.account_id, 'income', 'posted', 'income_rule',
        v_cat_id, v_cat_name, v_cat_color, v_cat_icon,
        coalesce(nullif(trim(v_rule.title), ''), 'Авто-пополнение'),
        v_rule.amount, v_date, v_user_id, v_user_id
      )
      returning * into v_tx;

      update public.income_occurrences
      set transaction_id = v_tx.id
      where id = v_inserted;

      update public.accounts
      set amount = amount + v_rule.amount, updated_by = v_user_id
      where id = v_rule.account_id;

      return next v_tx;
    end loop;
  end loop;
end;
$$;

revoke all on function public.apply_due_income_rules(date) from public;
grant execute on function public.apply_due_income_rules(date) to authenticated;

create or replace function public.skip_income_occurrence(p_occurrence_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_occ public.income_occurrences;
  v_tx public.transactions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_occ from public.income_occurrences where id = p_occurrence_id for update;
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
        set amount = amount - v_tx.amount, updated_by = v_user_id
        where id = v_tx.account_id;
        update public.transactions
        set status = 'cancelled', updated_by = v_user_id
        where id = v_tx.id;
      end if;
    end if;
  else
    if not exists (
      select 1 from public.income_rules ir
      where ir.id = v_occ.income_rule_id and public.is_account_member(ir.account_id)
    ) then
      raise exception 'Not an account member';
    end if;
  end if;

  update public.income_occurrences
  set status = 'skipped'
  where id = p_occurrence_id;
end;
$$;

revoke all on function public.skip_income_occurrence(uuid) from public;
grant execute on function public.skip_income_occurrence(uuid) to authenticated;

create or replace function public.adjust_income_occurrence(p_occurrence_id uuid, p_new_amount numeric)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_occ public.income_occurrences;
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

  select * into v_occ from public.income_occurrences where id = p_occurrence_id for update;
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
  set amount = amount + v_delta, updated_by = v_user_id
  where id = v_tx.account_id;

  update public.transactions
  set amount = v_amount, updated_by = v_user_id
  where id = v_tx.id
  returning * into v_tx;

  update public.income_occurrences
  set status = 'adjusted'
  where id = p_occurrence_id;

  return v_tx;
end;
$$;

revoke all on function public.adjust_income_occurrence(uuid, numeric) from public;
grant execute on function public.adjust_income_occurrence(uuid, numeric) to authenticated;
