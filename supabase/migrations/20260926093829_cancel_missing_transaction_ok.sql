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
    return;
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

  if v_tx.source = 'expense_rule' then
    select id into v_occ_id from public.expense_occurrences where transaction_id = v_tx.id;
    if v_occ_id is not null then
      perform public.skip_expense_occurrence(v_occ_id);
      return;
    end if;
  end if;

  if v_tx.source = 'transfer_rule' then
    select id into v_occ_id from public.transfer_occurrences where transaction_id = v_tx.id;
    if v_occ_id is not null then
      perform public.skip_transfer_occurrence(v_occ_id);
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
