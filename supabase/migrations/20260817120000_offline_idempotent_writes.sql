drop function if exists public.create_account(text, numeric, uuid[]);

create function public.create_account(
  p_name text,
  p_opening_amount numeric default 0,
  p_category_ids uuid[] default null,
  p_id uuid default null
)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.accounts;
  v_amount numeric(14, 2) := round(coalesce(p_opening_amount, 0), 2);
  v_category_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount < 0 then
    raise exception 'Opening amount must be >= 0';
  end if;

  if p_id is not null then
    select * into v_account from public.accounts where id = p_id;
    if v_account.id is not null then
      return v_account;
    end if;
  end if;

  insert into public.accounts (id, name, amount, owner_id, updated_by)
  values (
    coalesce(p_id, gen_random_uuid()),
    coalesce(nullif(trim(p_name), ''), 'Основной счёт'),
    v_amount,
    v_user_id,
    v_user_id
  )
  returning * into v_account;

  insert into public.account_members (account_id, user_id)
  values (v_account.id, v_user_id)
  on conflict do nothing;

  if p_category_ids is not null then
    foreach v_category_id in array p_category_ids loop
      if public.is_category_visible(v_category_id) then
        insert into public.category_accounts (category_id, account_id)
        values (v_category_id, v_account.id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_account;
end;
$$;

revoke all on function public.create_account(text, numeric, uuid[], uuid) from public;
grant execute on function public.create_account(text, numeric, uuid[], uuid) to authenticated;

drop function if exists public.transfer_between_accounts(uuid, uuid, numeric, date, text);

create function public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_occurred_on date,
  p_notes text default null,
  p_id uuid default null
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_amount numeric(14, 2) := round(p_amount, 2);
  v_tx public.transactions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_id is not null then
    select * into v_tx from public.transactions where id = p_id;
    if v_tx.id is not null then
      return v_tx;
    end if;
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Choose different accounts';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if not public.is_account_member(p_from_account_id) or not public.is_account_member(p_to_account_id) then
    raise exception 'Not an account member';
  end if;

  perform 1 from public.accounts where id = p_from_account_id for update;
  perform 1 from public.accounts where id = p_to_account_id for update;

  update public.accounts
  set amount = amount - v_amount, updated_by = v_user_id
  where id = p_from_account_id;

  update public.accounts
  set amount = amount + v_amount, updated_by = v_user_id
  where id = p_to_account_id;

  insert into public.transactions (
    id, account_id, counterparty_account_id, kind, status, source,
    title, amount, occurred_on, notes, created_by, updated_by
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    p_from_account_id, p_to_account_id, 'transfer', 'posted', 'manual',
    'Перевод', v_amount, coalesce(p_occurred_on, current_date), nullif(trim(p_notes), ''),
    v_user_id, v_user_id
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke all on function public.transfer_between_accounts(uuid, uuid, numeric, date, text, uuid) from public;
grant execute on function public.transfer_between_accounts(uuid, uuid, numeric, date, text, uuid) to authenticated;

drop function if exists public.complete_purchase(uuid);

create function public.complete_purchase(
  p_purchase_id uuid,
  p_transaction_id uuid default null
)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_purchase public.purchases;
  v_tx_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if v_purchase.id is null then
    raise exception 'Purchase not found';
  end if;

  if not public.is_account_member(v_purchase.account_id) then
    raise exception 'Not an account member';
  end if;

  if v_purchase.status = 'done' then
    return v_purchase;
  end if;

  if v_purchase.status <> 'planned' then
    raise exception 'Purchase is not planned';
  end if;

  if p_transaction_id is not null then
    select id into v_tx_id from public.transactions where id = p_transaction_id;
  end if;

  if v_tx_id is null then
    insert into public.transactions (
      id, account_id, kind, status, source, category_id, category_name, category_color, category_icon,
      title, amount, occurred_on, notes, created_by, updated_by
    )
    values (
      coalesce(p_transaction_id, gen_random_uuid()),
      v_purchase.account_id, 'expense', 'posted', 'purchase',
      v_purchase.category_id, v_purchase.category_name, v_purchase.category_color, v_purchase.category_icon,
      v_purchase.title, v_purchase.amount, v_purchase.planned_date, v_purchase.notes,
      v_user_id, v_user_id
    )
    returning id into v_tx_id;

    update public.accounts
    set amount = amount - v_purchase.amount, updated_by = v_user_id
    where id = v_purchase.account_id;
  end if;

  update public.purchases
  set status = 'done', updated_by = v_user_id
  where id = v_purchase.id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

revoke all on function public.complete_purchase(uuid, uuid) from public;
grant execute on function public.complete_purchase(uuid, uuid) to authenticated;

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
  if v_tx.id is null then
    raise exception 'Transaction not found';
  end if;

  if v_tx.status = 'cancelled' then
    return;
  end if;

  if v_tx.status <> 'posted' then
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

create or replace function public.adjust_account_amount(
  p_account_id uuid,
  p_delta numeric
)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.accounts;
  v_delta numeric(14, 2) := round(coalesce(p_delta, 0), 2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'Not an account member';
  end if;

  update public.accounts
  set amount = amount + v_delta, updated_by = v_user_id
  where id = p_account_id
  returning * into v_account;

  if v_account.id is null then
    raise exception 'Account not found';
  end if;

  return v_account;
end;
$$;

revoke all on function public.adjust_account_amount(uuid, numeric) from public;
grant execute on function public.adjust_account_amount(uuid, numeric) to authenticated;

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

  if v_occ.status = 'skipped' then
    return;
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

  if v_occ.status = 'skipped' then
    return;
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
