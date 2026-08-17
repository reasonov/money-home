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

  if p_id is not null then
    select * into v_category from public.categories where id = p_id;
  end if;

  if v_category.id is not null then
    if not public.is_category_visible(p_id) then
      raise exception 'Category not found';
    end if;

    update public.categories
    set kind = p_kind, name = trim(p_name), color = p_color, icon = p_icon
    where id = p_id
    returning * into v_category;
  else
    insert into public.categories (id, kind, name, color, icon, created_by)
    values (coalesce(p_id, gen_random_uuid()), p_kind, trim(p_name), p_color, p_icon, v_user_id)
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
revoke execute on function public.upsert_category(text, text, text, text, uuid[], uuid) from anon, public;
