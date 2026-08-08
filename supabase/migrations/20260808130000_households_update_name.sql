create policy households_update on public.households
for update to authenticated
using (public.is_household_member(id))
with check (public.is_household_member(id));

alter table public.households replica identity full;
alter publication supabase_realtime add table public.households;
