create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
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

  if not exists (
    select 1 from public.account_members m where m.user_id = new.id
  ) then
    insert into public.accounts (name, amount, owner_id, updated_by)
    values ('Основной счёт', 0, new.id, new.id)
    returning id into v_account_id;

    insert into public.account_members (account_id, user_id)
    values (v_account_id, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
