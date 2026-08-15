create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(14, 2) not null default 0 check (amount = round(amount, 2)),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text unique,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index account_members_user_id_idx on public.account_members (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('expense', 'income')),
  name text not null,
  color text not null,
  icon text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category_accounts (
  category_id uuid not null references public.categories (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  primary key (category_id, account_id)
);

create index category_accounts_account_id_idx on public.category_accounts (account_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  counterparty_account_id uuid references public.accounts (id) on delete set null,
  kind text not null check (kind in ('expense', 'income', 'transfer')),
  status text not null default 'posted' check (status in ('posted', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'income_rule', 'purchase')),
  category_id uuid references public.categories (id) on delete set null,
  category_name text,
  category_color text,
  category_icon text,
  title text,
  amount numeric(14, 2) not null check (amount > 0 and amount = round(amount, 2)),
  occurred_on date not null,
  notes text,
  created_by uuid not null references auth.users (id) on delete cascade,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_account_occurred_idx on public.transactions (account_id, occurred_on desc);

create table public.income_occurrences (
  id uuid primary key default gen_random_uuid(),
  income_rule_id uuid not null,
  occurred_on date not null,
  status text not null check (status in ('posted', 'skipped', 'adjusted')),
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (income_rule_id, occurred_on)
);

insert into public.profiles (user_id, display_name)
select
  m.user_id,
  m.display_name
from public.members m
on conflict (user_id) do nothing;

insert into public.accounts (id, name, amount, owner_id, invite_code, updated_by, created_at, updated_at)
select
  h.id,
  h.name,
  coalesce(b.amount, 0),
  (
    select m.user_id
    from public.members m
    where m.household_id = h.id
    order by m.created_at
    limit 1
  ),
  h.invite_code,
  b.updated_by,
  h.created_at,
  h.updated_at
from public.households h
left join public.balances b on b.household_id = h.id
where exists (select 1 from public.members m where m.household_id = h.id);

insert into public.account_members (account_id, user_id, created_at)
select m.household_id, m.user_id, m.created_at
from public.members m
join public.accounts a on a.id = m.household_id;

alter table public.income_rules
  add column account_id uuid references public.accounts (id) on delete cascade,
  add column title text,
  add column category_id uuid references public.categories (id) on delete set null,
  add column starts_on date not null default current_date;

update public.income_rules ir
set account_id = ir.household_id,
    starts_on = current_date;

alter table public.purchases
  add column account_id uuid references public.accounts (id) on delete cascade,
  add column category_id uuid references public.categories (id) on delete set null,
  add column category_name text,
  add column category_color text,
  add column category_icon text;

update public.purchases p
set account_id = p.household_id;

insert into public.categories (kind, name, color, icon, created_by)
select
  'expense',
  'Прочее',
  '#64748B',
  'other',
  a.owner_id
from public.accounts a
where exists (select 1 from public.purchases p where p.account_id = a.id and p.category_id is null);

insert into public.category_accounts (category_id, account_id)
select c.id, a.id
from public.accounts a
join public.categories c
  on c.created_by = a.owner_id
 and c.name = 'Прочее'
 and c.kind = 'expense'
where exists (select 1 from public.purchases p where p.account_id = a.id and p.category_id is null);

update public.purchases p
set
  category_id = c.id,
  category_name = c.name,
  category_color = c.color,
  category_icon = c.icon
from public.category_accounts ca
join public.categories c on c.id = ca.category_id
where ca.account_id = p.account_id
  and c.kind = 'expense'
  and c.name = 'Прочее'
  and p.category_id is null;

drop policy if exists households_select on public.households;
drop policy if exists households_update on public.households;
drop policy if exists members_select on public.members;
drop policy if exists members_update_own on public.members;
drop policy if exists balances_select on public.balances;
drop policy if exists balances_update on public.balances;
drop policy if exists income_rules_select on public.income_rules;
drop policy if exists income_rules_insert on public.income_rules;
drop policy if exists income_rules_update on public.income_rules;
drop policy if exists income_rules_delete on public.income_rules;
drop policy if exists purchases_select on public.purchases;
drop policy if exists purchases_insert on public.purchases;
drop policy if exists purchases_update on public.purchases;

alter publication supabase_realtime drop table public.balances;
alter publication supabase_realtime drop table public.purchases;
alter publication supabase_realtime drop table public.income_rules;
alter publication supabase_realtime drop table public.members;
alter publication supabase_realtime drop table public.households;

drop function if exists public.complete_purchase(uuid);
drop function if exists public.create_household(text, text);
drop function if exists public.join_household(text, text);
drop function if exists public.is_household_member(uuid);

alter table public.income_rules drop column household_id;
alter table public.income_rules alter column account_id set not null;
alter table public.purchases drop column household_id;
alter table public.purchases alter column account_id set not null;

drop table public.balances;
drop table public.members;
drop table public.households;

alter table public.income_occurrences
  add constraint income_occurrences_income_rule_id_fkey
  foreign key (income_rule_id) references public.income_rules (id) on delete cascade;

create index income_rules_account_id_idx on public.income_rules (account_id);
create index purchases_account_id_idx on public.purchases (account_id);
create index purchases_account_status_idx on public.purchases (account_id, status);

drop trigger if exists income_rules_set_updated_at on public.income_rules;
drop trigger if exists purchases_set_updated_at on public.purchases;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger income_rules_set_updated_at
before update on public.income_rules
for each row execute function public.set_updated_at();

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();
