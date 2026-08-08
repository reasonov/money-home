alter table public.members replica identity full;
alter publication supabase_realtime add table public.members;
