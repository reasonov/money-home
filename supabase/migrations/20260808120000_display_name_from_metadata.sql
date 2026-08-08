create or replace function public.current_display_name(p_display_name text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(trim(p_display_name), ''),
    nullif(
      trim(
        coalesce(
          (select u.raw_user_meta_data ->> 'display_name' from auth.users u where u.id = (select auth.uid())),
          (select u.raw_user_meta_data ->> 'full_name' from auth.users u where u.id = (select auth.uid())),
          ''
        )
      ),
      ''
    ),
    nullif(split_part(coalesce((select u.email from auth.users u where u.id = (select auth.uid())), ''), '@', 1), ''),
    'Участник'
  );
$$;
