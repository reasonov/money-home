create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  title text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0 and target_amount = round(target_amount, 2)),
  target_date date not null,
  saved_amount numeric(14, 2) not null default 0 check (saved_amount >= 0 and saved_amount = round(saved_amount, 2)),
  started_on date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index savings_goals_account_id_idx on public.savings_goals (account_id);
create index savings_goals_account_status_idx on public.savings_goals (account_id, status);

create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;

create policy savings_goals_select on public.savings_goals
for select to authenticated
using (public.is_account_member(account_id));

create policy savings_goals_insert on public.savings_goals
for insert to authenticated
with check (
  public.is_account_member(account_id)
  and created_by = (select auth.uid())
);

create policy savings_goals_update on public.savings_goals
for update to authenticated
using (public.is_account_member(account_id))
with check (public.is_account_member(account_id));

create policy savings_goals_delete on public.savings_goals
for delete to authenticated
using (public.is_account_member(account_id));

alter table public.savings_goals replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception when duplicate_object then null;
end $$;
