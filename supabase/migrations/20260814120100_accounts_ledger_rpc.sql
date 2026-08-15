create or replace function public.is_account_member(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_members m
    where m.account_id = p_account_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_account_member(uuid) from public;
grant execute on function public.is_account_member(uuid) to authenticated;

create or replace function public.is_category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.category_accounts ca
    join public.account_members m on m.account_id = ca.account_id
    where ca.category_id = p_category_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_category_visible(uuid) from public;
grant execute on function public.is_category_visible(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Участник'
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (user_id, display_name)
  values (v_user_id, public.current_display_name())
  on conflict (user_id) do update
    set display_name = excluded.display_name
  where public.profiles.display_name is distinct from excluded.display_name
  returning * into v_profile;

  if v_profile.user_id is null then
    select * into v_profile from public.profiles where user_id = v_user_id;
  end if;

  return v_profile;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;
