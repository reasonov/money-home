drop function if exists public.delete_category_group(uuid);

create function public.delete_category_group(
  p_id uuid,
  p_delete_children boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_category_group_visible(p_id) then
    raise exception 'Category group not found';
  end if;

  if p_delete_children then
    delete from public.categories where group_id = p_id;
    delete from public.category_groups where id = p_id;
    return;
  end if;

  for v_account_id in
    select account_id from public.category_group_accounts where group_id = p_id
  loop
    insert into public.category_accounts (category_id, account_id)
    select c.id, v_account_id
    from public.categories c
    where c.group_id = p_id
    on conflict do nothing;
  end loop;

  update public.categories
  set group_id = null
  where group_id = p_id;

  delete from public.category_groups where id = p_id;
end;
$$;

revoke all on function public.delete_category_group(uuid, boolean) from public;
grant execute on function public.delete_category_group(uuid, boolean) to authenticated;
revoke execute on function public.delete_category_group(uuid, boolean) from anon, public;
