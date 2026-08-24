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
      set color = v_child.color,
          color_manual = false
      where id = v_child.id
        and group_id = v_group.id;
    end loop;
  end if;

  return v_group;
end;
$$;
