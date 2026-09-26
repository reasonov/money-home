create or replace function public.adjust_due_income(
  p_rule_id uuid,
  p_occurred_on date,
  p_amount numeric,
  p_title text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.income_rules;
  v_occ public.income_occurrences;
  v_occ_id uuid;
  v_tx public.transactions;
  v_amount numeric(14, 2) := round(p_amount, 2);
  v_cat_id uuid;
  v_cat_name text;
  v_cat_color text;
  v_cat_icon text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_rule from public.income_rules where id = p_rule_id;
  if v_rule.id is null or not public.is_account_member(v_rule.account_id) then
    raise exception 'Not an account member';
  end if;

  insert into public.income_occurrences (income_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'adjusted')
  on conflict (income_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is null then
    select * into v_occ
    from public.income_occurrences
    where income_rule_id = p_rule_id and occurred_on = p_occurred_on
    for update;

    if v_occ.transaction_id is not null then
      v_tx := public.adjust_income_occurrence(v_occ.id, v_amount);
      if p_title is not null or p_notes is not null then
        update public.transactions
        set
          title = case when p_title is null then title else nullif(trim(p_title), '') end,
          notes = case when p_notes is null then notes else nullif(trim(p_notes), '') end,
          updated_by = v_user_id
        where id = v_tx.id;
      end if;
      return;
    end if;

    if v_occ.status = 'skipped' then
      return;
    end if;

    v_occ_id := v_occ.id;
  end if;

  if v_rule.category_id is not null then
    select c.id, c.name, c.color, c.icon
    into v_cat_id, v_cat_name, v_cat_color, v_cat_icon
    from public.categories c
    where c.id = v_rule.category_id;
  end if;

  perform 1 from public.accounts where id = v_rule.account_id for update;

  insert into public.transactions (
    account_id, kind, status, source, category_id, category_name, category_color, category_icon,
    title, notes, amount, occurred_on, created_by, updated_by
  )
  values (
    v_rule.account_id, 'income', 'posted', 'income_rule',
    v_cat_id, v_cat_name, v_cat_color, v_cat_icon,
    coalesce(nullif(trim(p_title), ''), nullif(trim(v_rule.title), ''), 'Авто-пополнение'),
    nullif(trim(p_notes), ''),
    v_amount, p_occurred_on, v_user_id, v_user_id
  )
  returning * into v_tx;

  update public.income_occurrences
  set transaction_id = v_tx.id, status = 'adjusted'
  where id = v_occ_id;

  perform public.apply_posted_balance('income', v_rule.account_id, null, v_amount, v_user_id, 1);
end;
$$;

revoke all on function public.adjust_due_income(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.adjust_due_income(uuid, date, numeric, text, text) to authenticated;

create or replace function public.adjust_due_expense(
  p_rule_id uuid,
  p_occurred_on date,
  p_amount numeric,
  p_title text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.expense_rules;
  v_occ public.expense_occurrences;
  v_occ_id uuid;
  v_tx public.transactions;
  v_amount numeric(14, 2) := round(p_amount, 2);
  v_cat_id uuid;
  v_cat_name text;
  v_cat_color text;
  v_cat_icon text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_rule from public.expense_rules where id = p_rule_id;
  if v_rule.id is null or not public.is_account_member(v_rule.account_id) then
    raise exception 'Not an account member';
  end if;

  insert into public.expense_occurrences (expense_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'adjusted')
  on conflict (expense_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is null then
    select * into v_occ
    from public.expense_occurrences
    where expense_rule_id = p_rule_id and occurred_on = p_occurred_on
    for update;

    if v_occ.transaction_id is not null then
      v_tx := public.adjust_expense_occurrence(v_occ.id, v_amount);
      if p_title is not null or p_notes is not null then
        update public.transactions
        set
          title = case when p_title is null then title else nullif(trim(p_title), '') end,
          notes = case when p_notes is null then notes else nullif(trim(p_notes), '') end,
          updated_by = v_user_id
        where id = v_tx.id;
      end if;
      return;
    end if;

    if v_occ.status = 'skipped' then
      return;
    end if;

    v_occ_id := v_occ.id;
  end if;

  if v_rule.category_id is not null then
    select c.id, c.name, c.color, c.icon
    into v_cat_id, v_cat_name, v_cat_color, v_cat_icon
    from public.categories c
    where c.id = v_rule.category_id;
  end if;

  perform 1 from public.accounts where id = v_rule.account_id for update;

  insert into public.transactions (
    account_id, kind, status, source, category_id, category_name, category_color, category_icon,
    title, notes, amount, occurred_on, created_by, updated_by
  )
  values (
    v_rule.account_id, 'expense', 'posted', 'expense_rule',
    v_cat_id, v_cat_name, v_cat_color, v_cat_icon,
    coalesce(nullif(trim(p_title), ''), nullif(trim(v_rule.title), ''), 'Регулярный расход'),
    nullif(trim(p_notes), ''),
    v_amount, p_occurred_on, v_user_id, v_user_id
  )
  returning * into v_tx;

  update public.expense_occurrences
  set transaction_id = v_tx.id, status = 'adjusted'
  where id = v_occ_id;

  perform public.apply_posted_balance('expense', v_rule.account_id, null, v_amount, v_user_id, 1);
end;
$$;

revoke all on function public.adjust_due_expense(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.adjust_due_expense(uuid, date, numeric, text, text) to authenticated;

create or replace function public.adjust_due_transfer(
  p_rule_id uuid,
  p_occurred_on date,
  p_amount numeric,
  p_title text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.transfer_rules;
  v_occ public.transfer_occurrences;
  v_occ_id uuid;
  v_tx public.transactions;
  v_amount numeric(14, 2) := round(p_amount, 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_rule from public.transfer_rules where id = p_rule_id;
  if v_rule.id is null
    or not public.is_account_member(v_rule.from_account_id)
    or not public.is_account_member(v_rule.to_account_id)
  then
    raise exception 'Not an account member';
  end if;

  insert into public.transfer_occurrences (transfer_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'adjusted')
  on conflict (transfer_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is null then
    select * into v_occ
    from public.transfer_occurrences
    where transfer_rule_id = p_rule_id and occurred_on = p_occurred_on
    for update;

    if v_occ.transaction_id is not null then
      v_tx := public.adjust_transfer_occurrence(v_occ.id, v_amount);
      if p_title is not null or p_notes is not null then
        update public.transactions
        set
          title = case when p_title is null then title else nullif(trim(p_title), '') end,
          notes = case when p_notes is null then notes else nullif(trim(p_notes), '') end,
          updated_by = v_user_id
        where id = v_tx.id;
      end if;
      return;
    end if;

    if v_occ.status = 'skipped' then
      return;
    end if;

    v_occ_id := v_occ.id;
  end if;

  perform 1
  from public.accounts a
  where a.id = any(array[v_rule.from_account_id, v_rule.to_account_id])
  order by a.id
  for update;

  insert into public.transactions (
    account_id, counterparty_account_id, kind, status, source,
    title, notes, amount, occurred_on, created_by, updated_by
  )
  values (
    v_rule.from_account_id, v_rule.to_account_id, 'transfer', 'posted', 'transfer_rule',
    coalesce(nullif(trim(p_title), ''), nullif(trim(v_rule.title), ''), 'Перевод'),
    nullif(trim(p_notes), ''),
    v_amount, p_occurred_on, v_user_id, v_user_id
  )
  returning * into v_tx;

  update public.transfer_occurrences
  set transaction_id = v_tx.id, status = 'adjusted'
  where id = v_occ_id;

  perform public.apply_posted_balance(
    'transfer', v_rule.from_account_id, v_rule.to_account_id, v_amount, v_user_id, 1
  );
end;
$$;

revoke all on function public.adjust_due_transfer(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.adjust_due_transfer(uuid, date, numeric, text, text) to authenticated;
