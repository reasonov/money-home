create table if not exists public.operation_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0 and amount = round(amount, 2)),
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operation_templates_user_id_idx on public.operation_templates (user_id);

alter table public.operation_templates
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists operation_templates_set_updated_at on public.operation_templates;
create trigger operation_templates_set_updated_at
before update on public.operation_templates
for each row execute function public.set_updated_at();

alter table public.operation_templates enable row level security;

drop policy if exists operation_templates_select on public.operation_templates;
create policy operation_templates_select on public.operation_templates
for select to authenticated
using (user_id = auth.uid());

drop policy if exists operation_templates_insert on public.operation_templates;
create policy operation_templates_insert on public.operation_templates
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_category_visible(category_id)
);

drop policy if exists operation_templates_update on public.operation_templates;
create policy operation_templates_update on public.operation_templates
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.is_category_visible(category_id)
);

drop policy if exists operation_templates_delete on public.operation_templates;
create policy operation_templates_delete on public.operation_templates
for delete to authenticated
using (user_id = auth.uid());

alter table public.operation_templates replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.operation_templates;
exception when duplicate_object then null;
end $$;
