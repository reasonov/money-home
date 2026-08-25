alter table public.purchases
  alter column planned_date drop not null;

create or replace function public.complete_purchase(
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
      v_purchase.title, v_purchase.amount,
      coalesce(v_purchase.planned_date, (timezone('Europe/Moscow', now()))::date),
      v_purchase.notes,
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
revoke execute on function public.complete_purchase(uuid, uuid) from anon;
grant execute on function public.complete_purchase(uuid, uuid) to authenticated;
