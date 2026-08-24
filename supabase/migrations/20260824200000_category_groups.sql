create table public.category_groups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('expense', 'income')),
  name text not null,
  color text not null,
  icon text not null,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category_group_accounts (
  group_id uuid not null references public.category_groups (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  primary key (group_id, account_id)
);

create index category_group_accounts_account_id_idx on public.category_group_accounts (account_id);

alter table public.categories
  add column group_id uuid references public.category_groups (id) on delete set null,
  add column color_manual boolean not null default false,
  add column sort_order integer not null default 0;

create index categories_group_id_idx on public.categories (group_id);

with ranked as (
  select id, row_number() over (partition by kind order by name, id) as rn
  from public.categories
)
update public.categories c
set sort_order = ranked.rn
from ranked
where c.id = ranked.id;

create trigger category_groups_set_updated_at
before update on public.category_groups
for each row execute function public.set_updated_at();

create or replace function public.enforce_category_group_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kind text;
begin
  if new.group_id is null then
    return new;
  end if;
  select kind into v_kind from public.category_groups where id = new.group_id;
  if v_kind is null then
    raise exception 'Category group not found';
  end if;
  if new.kind <> v_kind then
    raise exception 'Category kind must match group';
  end if;
  return new;
end;
$$;

create trigger categories_group_kind
before insert or update of group_id, kind on public.categories
for each row execute function public.enforce_category_group_kind();

create or replace function public.is_category_group_visible(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.category_group_accounts cga
    join public.account_members m on m.account_id = cga.account_id
    where cga.group_id = p_group_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_category_group_visible(uuid) from public;
grant execute on function public.is_category_group_visible(uuid) to authenticated;

create or replace function public.is_category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and (
        (
          c.group_id is not null
          and exists (
            select 1
            from public.category_group_accounts cga
            join public.account_members m on m.account_id = cga.account_id
            where cga.group_id = c.group_id
              and m.user_id = (select auth.uid())
          )
        )
        or (
          c.group_id is null
          and exists (
            select 1
            from public.category_accounts ca
            join public.account_members m on m.account_id = ca.account_id
            where ca.category_id = c.id
              and m.user_id = (select auth.uid())
          )
        )
      )
  );
$$;

create or replace function public.prune_orphan_categories()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.category_groups g
  where not exists (
    select 1 from public.category_group_accounts cga where cga.group_id = g.id
  );

  delete from public.categories c
  where c.group_id is null
    and not exists (
      select 1 from public.category_accounts ca where ca.category_id = c.id
    );
end;
$$;

revoke all on function public.prune_orphan_categories() from public;

alter table public.category_groups enable row level security;
alter table public.category_group_accounts enable row level security;

create policy category_groups_select on public.category_groups
for select to authenticated
using (public.is_category_group_visible(id));

create policy category_group_accounts_select on public.category_group_accounts
for select to authenticated
using (public.is_account_member(account_id) or public.is_category_group_visible(group_id));

alter table public.category_groups replica identity full;
alter table public.category_group_accounts replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.category_groups;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.category_group_accounts;
exception when duplicate_object then null;
end $$;

create or replace function public.upsert_category_group(
  p_kind text,
  p_name text,
  p_color text,
  p_icon text,
  p_account_ids uuid[],
  p_id uuid default null,
  p_sort_order integer default 0,
  p_child_colors jsonb default null
)
returns public.category_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.category_groups;
  v_account_id uuid;
  v_ids uuid[] := coalesce(p_account_ids, '{}');
  v_child record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_kind not in ('expense', 'income') then
    raise exception 'Invalid category kind';
  end if;

  if coalesce(nullif(trim(p_name), ''), '') = '' then
    raise exception 'Category group name required';
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
    select * into v_group from public.category_groups where id = p_id;
  end if;

  if v_group.id is not null then
    if not public.is_category_group_visible(p_id) then
      raise exception 'Category group not found';
    end if;

    update public.category_groups
    set kind = p_kind,
        name = trim(p_name),
        color = p_color,
        icon = p_icon,
        sort_order = coalesce(p_sort_order, sort_order)
    where id = p_id
    returning * into v_group;
  else
    insert into public.category_groups (id, kind, name, color, icon, sort_order, created_by)
    values (
      coalesce(p_id, gen_random_uuid()),
      p_kind,
      trim(p_name),
      p_color,
      p_icon,
      coalesce(p_sort_order, 0),
      v_user_id
    )
    returning * into v_group;
  end if;

  delete from public.category_group_accounts cga
  where cga.group_id = v_group.id
    and public.is_account_member(cga.account_id)
    and not (cga.account_id = any (v_ids));

  foreach v_account_id in array v_ids loop
    insert into public.category_group_accounts (group_id, account_id)
    values (v_group.id, v_account_id)
    on conflict do nothing;
  end loop;

  if not exists (select 1 from public.category_group_accounts where group_id = v_group.id) then
    delete from public.category_groups where id = v_group.id;
    raise exception 'Category group removed';
  end if;

  if p_child_colors is not null then
    for v_child in
      select x.id, x.color
      from jsonb_to_recordset(p_child_colors) as x(id uuid, color text)
    loop
      update public.categories
      set color = v_child.color
      where id = v_child.id
        and group_id = v_group.id
        and color_manual = false;
    end loop;
  end if;

  return v_group;
end;
$$;

revoke all on function public.upsert_category_group(text, text, text, text, uuid[], uuid, integer, jsonb) from public;
grant execute on function public.upsert_category_group(text, text, text, text, uuid[], uuid, integer, jsonb) to authenticated;
revoke execute on function public.upsert_category_group(text, text, text, text, uuid[], uuid, integer, jsonb) from anon, public;

create or replace function public.delete_category_group(p_id uuid)
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

revoke all on function public.delete_category_group(uuid) from public;
grant execute on function public.delete_category_group(uuid) to authenticated;
revoke execute on function public.delete_category_group(uuid) from anon, public;

drop function if exists public.upsert_category(text, text, text, text, uuid[], uuid);

create function public.upsert_category(
  p_kind text,
  p_name text,
  p_color text,
  p_icon text,
  p_account_ids uuid[],
  p_id uuid default null,
  p_group_id uuid default null,
  p_color_manual boolean default false,
  p_sort_order integer default 0
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
  v_group public.category_groups;
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

  if p_group_id is not null then
    select * into v_group from public.category_groups where id = p_group_id;
    if v_group.id is null or not public.is_category_group_visible(p_group_id) then
      raise exception 'Category group not found';
    end if;
    if v_group.kind <> p_kind then
      raise exception 'Category kind must match group';
    end if;
  elsif array_length(v_ids, 1) is null then
    raise exception 'Select at least one account';
  else
    foreach v_account_id in array v_ids loop
      if not public.is_account_member(v_account_id) then
        raise exception 'Not an account member';
      end if;
    end loop;
  end if;

  if p_id is not null then
    select * into v_category from public.categories where id = p_id;
  end if;

  if v_category.id is not null then
    if not public.is_category_visible(p_id) then
      raise exception 'Category not found';
    end if;

    update public.categories
    set kind = p_kind,
        name = trim(p_name),
        color = p_color,
        icon = p_icon,
        group_id = p_group_id,
        color_manual = coalesce(p_color_manual, false),
        sort_order = coalesce(p_sort_order, sort_order)
    where id = p_id
    returning * into v_category;
  else
    insert into public.categories (
      id, kind, name, color, icon, created_by, group_id, color_manual, sort_order
    )
    values (
      coalesce(p_id, gen_random_uuid()),
      p_kind,
      trim(p_name),
      p_color,
      p_icon,
      v_user_id,
      p_group_id,
      coalesce(p_color_manual, false),
      coalesce(p_sort_order, 0)
    )
    returning * into v_category;
  end if;

  if p_group_id is not null then
    delete from public.category_accounts where category_id = v_category.id;
  else
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
  end if;

  return v_category;
end;
$$;

revoke all on function public.upsert_category(text, text, text, text, uuid[], uuid, uuid, boolean, integer) from public;
grant execute on function public.upsert_category(text, text, text, text, uuid[], uuid, uuid, boolean, integer) to authenticated;
revoke execute on function public.upsert_category(text, text, text, text, uuid[], uuid, uuid, boolean, integer) from anon, public;

drop function if exists public.set_account_categories(uuid, uuid[]);

create function public.set_account_categories(
  p_account_id uuid,
  p_category_ids uuid[],
  p_group_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cat_ids uuid[] := coalesce(p_category_ids, '{}');
  v_group_ids uuid[] := coalesce(p_group_ids, '{}');
  v_category_id uuid;
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'Not an account member';
  end if;

  foreach v_category_id in array v_cat_ids loop
    if exists (select 1 from public.categories where id = v_category_id and group_id is not null) then
      raise exception 'Category not found';
    end if;
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

  foreach v_group_id in array v_group_ids loop
    if not (
      public.is_category_group_visible(v_group_id)
      or exists (
        select 1 from public.category_group_accounts cga
        where cga.group_id = v_group_id and cga.account_id = p_account_id
      )
    ) then
      raise exception 'Category group not found';
    end if;
  end loop;

  delete from public.category_accounts
  where account_id = p_account_id
    and not (category_id = any (v_cat_ids));

  foreach v_category_id in array v_cat_ids loop
    insert into public.category_accounts (category_id, account_id)
    values (v_category_id, p_account_id)
    on conflict do nothing;
  end loop;

  delete from public.category_group_accounts
  where account_id = p_account_id
    and not (group_id = any (v_group_ids));

  foreach v_group_id in array v_group_ids loop
    insert into public.category_group_accounts (group_id, account_id)
    values (v_group_id, p_account_id)
    on conflict do nothing;
  end loop;

  perform public.prune_orphan_categories();
end;
$$;

revoke all on function public.set_account_categories(uuid, uuid[], uuid[]) from public;
grant execute on function public.set_account_categories(uuid, uuid[], uuid[]) to authenticated;
revoke execute on function public.set_account_categories(uuid, uuid[], uuid[]) from anon, public;

drop function if exists public.create_account(text, numeric, uuid[], uuid);

create function public.create_account(
  p_name text,
  p_opening_amount numeric default 0,
  p_category_ids uuid[] default null,
  p_id uuid default null,
  p_group_ids uuid[] default null
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
  v_group_id uuid;
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
      if public.is_category_visible(v_category_id)
        and exists (select 1 from public.categories c where c.id = v_category_id and c.group_id is null)
      then
        insert into public.category_accounts (category_id, account_id)
        values (v_category_id, v_account.id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  if p_group_ids is not null then
    foreach v_group_id in array p_group_ids loop
      if public.is_category_group_visible(v_group_id) then
        insert into public.category_group_accounts (group_id, account_id)
        values (v_group_id, v_account.id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_account;
end;
$$;

revoke all on function public.create_account(text, numeric, uuid[], uuid, uuid[]) from public;
grant execute on function public.create_account(text, numeric, uuid[], uuid, uuid[]) to authenticated;
revoke execute on function public.create_account(text, numeric, uuid[], uuid, uuid[]) from anon, public;

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
      perform public.prune_orphan_categories();
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
