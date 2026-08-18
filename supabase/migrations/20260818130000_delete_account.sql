create or replace function public.delete_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
  v_member_count integer;
  v_successor uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'Not an account member';
  end if;

  select owner_id into v_owner
  from public.accounts
  where id = p_account_id
  for update;

  if v_owner is null then
    raise exception 'Account not found';
  end if;

  select count(*) into v_member_count
  from public.account_members
  where account_id = p_account_id;

  if v_owner = v_user_id then
    if v_member_count <= 1 then
      delete from public.accounts where id = p_account_id;

      delete from public.categories c
      where not exists (
        select 1 from public.category_accounts ca where ca.category_id = c.id
      );
      return;
    end if;

    select user_id into v_successor
    from public.account_members
    where account_id = p_account_id
      and user_id <> v_user_id
    order by created_at asc, user_id asc
    limit 1;

    if v_successor is null then
      raise exception 'Account not found';
    end if;

    update public.accounts
    set owner_id = v_successor, updated_by = v_user_id
    where id = p_account_id;
  end if;

  delete from public.account_members
  where account_id = p_account_id and user_id = v_user_id;
end;
$$;

revoke all on function public.delete_account(uuid) from public;
revoke execute on function public.delete_account(uuid) from anon, public;
grant execute on function public.delete_account(uuid) to authenticated;
