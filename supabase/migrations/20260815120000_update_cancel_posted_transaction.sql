create or replace function public.apply_posted_balance(
  p_kind text,
  p_account_id uuid,
  p_counterparty_account_id uuid,
  p_amount numeric,
  p_user_id uuid,
  p_multiplier integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'expense' then
    update public.accounts
    set amount = amount - (p_amount * p_multiplier), updated_by = p_user_id
    where id = p_account_id;
  elsif p_kind = 'income' then
    update public.accounts
    set amount = amount + (p_amount * p_multiplier), updated_by = p_user_id
    where id = p_account_id;
  elsif p_kind = 'transfer' then
    if p_counterparty_account_id is null then
      raise exception 'Choose different accounts';
    end if;
    update public.accounts
    set amount = amount - (p_amount * p_multiplier), updated_by = p_user_id
    where id = p_account_id;
    update public.accounts
    set amount = amount + (p_amount * p_multiplier), updated_by = p_user_id
    where id = p_counterparty_account_id;
  end if;
end;
$$;

revoke all on function public.apply_posted_balance(text, uuid, uuid, numeric, uuid, integer) from public;

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

  if v_tx.source = 'income_rule' then
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

  return v_tx;
end;
$$;

revoke all on function public.update_posted_transaction(uuid, uuid, numeric, date, uuid, uuid, text, text) from public;
grant execute on function public.update_posted_transaction(uuid, uuid, numeric, date, uuid, uuid, text, text) to authenticated;

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

revoke all on function public.cancel_posted_transaction(uuid) from public;
grant execute on function public.cancel_posted_transaction(uuid) to authenticated;
