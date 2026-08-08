revoke execute on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

revoke execute on function public.generate_invite_code() from public, anon, authenticated;

revoke execute on function public.current_display_name(text) from public, anon, authenticated;

revoke execute on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

revoke execute on function public.join_household(text, text) from public, anon;
grant execute on function public.join_household(text, text) to authenticated;

revoke execute on function public.complete_purchase(uuid) from public, anon;
grant execute on function public.complete_purchase(uuid) to authenticated;
