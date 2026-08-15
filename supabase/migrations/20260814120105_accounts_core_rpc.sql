create or replace function public.create_account(
  p_name text,
  p_opening_amount numeric default 0,
  p_category_ids uuid[] default null
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

  insert into public.accounts (name, amount, owner_id, updated_by)
  values (coalesce(nullif(trim(p_name), ''), 'Основной счёт'), v_amount, v_user_id, v_user_id)
  returning * into v_account;

  insert into public.account_members (account_id, user_id)
  values (v_account.id, v_user_id);

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

revoke all on function public.create_account(text, numeric, uuid[]) from public;
grant execute on function public.create_account(text, numeric, uuid[]) to authenticated;

create or replace function public.share_account(p_account_id uuid)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.accounts;
  v_code text;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'Not an account member';
  end if;

  select * into v_account from public.accounts where id = p_account_id for update;
  if v_account.id is null then
    raise exception 'Account not found';
  end if;

  if v_account.invite_code is not null then
    return v_account;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_invite_code();
    begin
      update public.accounts
      set invite_code = v_code, updated_by = v_user_id
      where id = p_account_id
      returning * into v_account;
      exit;
    exception
      when unique_violation then
        if v_attempts >= 10 then
          raise;
        end if;
    end;
  end loop;

  return v_account;
end;
$$;

revoke all on function public.share_account(uuid) from public;
grant execute on function public.share_account(uuid) to authenticated;

create or replace function public.join_account(p_invite_code text)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.accounts;
  v_code text := upper(trim(p_invite_code));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_code = '' then
    raise exception 'Invite code required';
  end if;

  select * into v_account from public.accounts where invite_code = v_code;
  if v_account.id is null then
    raise exception 'Account not found';
  end if;

  insert into public.account_members (account_id, user_id)
  values (v_account.id, v_user_id)
  on conflict do nothing;

  return v_account;
end;
$$;

revoke all on function public.join_account(text) from public;
grant execute on function public.join_account(text) to authenticated;

create or replace function public.leave_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_owner from public.accounts where id = p_account_id;
  if v_owner is null then
    raise exception 'Account not found';
  end if;

  if v_owner = v_user_id then
    raise exception 'Owner cannot leave';
  end if;

  delete from public.account_members
  where account_id = p_account_id and user_id = v_user_id;
end;
$$;

revoke all on function public.leave_account(uuid) from public;
grant execute on function public.leave_account(uuid) to authenticated;

create or replace function public.upsert_category(
  p_kind text,
  p_name text,
  p_color text,
  p_icon text,
  p_account_ids uuid[],
  p_id uuid default null
)
returns public.categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_category public.categories;
  v_account_id uuid;
  v_ids uuid[] := coalesce(p_account_ids, '{}');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_kind not in ('expense', 'income') then
    raise exception 'Invalid category kind';
  end if;

  if coalesce(nullif(trim(p_name), ''), '') = '' then
    raise exception 'Category name required';
  end if;

  if array_length(v_ids, 1) is null then
    raise exception 'Select at least one account';
  end if;

  foreach v_account_id in array v_ids loop
    if not public.is_account_member(v_account_id) then
      raise exception 'Not an account member';
    end if;
  end loop;

  if p_id is null then
    insert into public.categories (kind, name, color, icon, created_by)
    values (p_kind, trim(p_name), p_color, p_icon, v_user_id)
    returning * into v_category;
  else
    if not public.is_category_visible(p_id) then
      raise exception 'Category not found';
    end if;

    update public.categories
    set kind = p_kind, name = trim(p_name), color = p_color, icon = p_icon
    where id = p_id
    returning * into v_category;
  end if;

  delete from public.category_accounts ca
  where ca.category_id = v_category.id
    and public.is_account_member(ca.account_id)
    and not (ca.account_id = any (v_ids));

  foreach v_account_id in array v_ids loop
    insert into public.category_accounts (category_id, account_id)
    values (v_category.id, v_account_id)
    on conflict do nothing;
  end loop;

  if not exists (select 1 from public.category_accounts where category_id = v_category.id) then
    delete from public.categories where id = v_category.id;
    raise exception 'Category removed';
  end if;

  return v_category;
end;
$$;

revoke all on function public.upsert_category(text, text, text, text, uuid[], uuid) from public;
grant execute on function public.upsert_category(text, text, text, text, uuid[], uuid) to authenticated;

create or replace function public.set_account_categories(p_account_id uuid, p_category_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_ids uuid[] := coalesce(p_category_ids, '{}');
  v_category_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'Not an account member';
  end if;

  foreach v_category_id in array v_ids loop
    if not (
      public.is_category_visible(v_category_id)
      or exists (
        select 1 from public.category_accounts ca
        where ca.category_id = v_category_id and ca.account_id = p_account_id
      )
    ) then
      raise exception 'Category not found';
    end if;
  end loop;

  delete from public.category_accounts
  where account_id = p_account_id
    and not (category_id = any (v_ids));

  foreach v_category_id in array v_ids loop
    insert into public.category_accounts (category_id, account_id)
    values (v_category_id, p_account_id)
    on conflict do nothing;
  end loop;

  delete from public.categories c
  where not exists (
    select 1 from public.category_accounts ca where ca.category_id = c.id
  );
end;
$$;

revoke all on function public.set_account_categories(uuid, uuid[]) from public;
grant execute on function public.set_account_categories(uuid, uuid[]) to authenticated;

create or replace function public.delete_category(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_category_visible(p_id) then
    raise exception 'Category not found';
  end if;
  delete from public.categories where id = p_id;
end;
$$;

revoke all on function public.delete_category(uuid) from public;
grant execute on function public.delete_category(uuid) to authenticated;

create or replace function public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_occurred_on date,
  p_notes text default null
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
    account_id, counterparty_account_id, kind, status, source,
    title, amount, occurred_on, notes, created_by, updated_by
  )
  values (
    p_from_account_id, p_to_account_id, 'transfer', 'posted', 'manual',
    'Перевод', v_amount, coalesce(p_occurred_on, current_date), nullif(trim(p_notes), ''),
    v_user_id, v_user_id
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke all on function public.transfer_between_accounts(uuid, uuid, numeric, date, text) from public;
grant execute on function public.transfer_between_accounts(uuid, uuid, numeric, date, text) to authenticated;

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

  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if v_purchase.id is null then
    raise exception 'Purchase not found';
  end if;

  if not public.is_account_member(v_purchase.account_id) then
    raise exception 'Not an account member';
  end if;

  if v_purchase.status <> 'planned' then
    raise exception 'Purchase is not planned';
  end if;

  insert into public.transactions (
    account_id, kind, status, source, category_id, category_name, category_color, category_icon,
    title, amount, occurred_on, notes, created_by, updated_by
  )
  values (
    v_purchase.account_id, 'expense', 'posted', 'purchase',
    v_purchase.category_id, v_purchase.category_name, v_purchase.category_color, v_purchase.category_icon,
    v_purchase.title, v_purchase.amount, v_purchase.planned_date, v_purchase.notes,
    v_user_id, v_user_id
  );

  update public.accounts
  set amount = amount - v_purchase.amount, updated_by = v_user_id
  where id = v_purchase.account_id;

  update public.purchases
  set status = 'done', updated_by = v_user_id
  where id = v_purchase.id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

revoke all on function public.complete_purchase(uuid) from public;
grant execute on function public.complete_purchase(uuid) to authenticated;
