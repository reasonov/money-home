alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.categories enable row level security;
alter table public.category_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.income_occurrences enable row level security;
alter table public.income_rules enable row level security;
alter table public.purchases enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists accounts_select on public.accounts;
drop policy if exists accounts_update on public.accounts;
drop policy if exists account_members_select on public.account_members;
drop policy if exists categories_select on public.categories;
drop policy if exists category_accounts_select on public.category_accounts;
drop policy if exists transactions_select on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists income_occurrences_select on public.income_occurrences;
drop policy if exists income_rules_select on public.income_rules;
drop policy if exists income_rules_insert on public.income_rules;
drop policy if exists income_rules_update on public.income_rules;
drop policy if exists income_rules_delete on public.income_rules;
drop policy if exists purchases_select on public.purchases;
drop policy if exists purchases_insert on public.purchases;
drop policy if exists purchases_update on public.purchases;

create policy profiles_select on public.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.account_members mine
    join public.account_members theirs on theirs.account_id = mine.account_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = profiles.user_id
  )
);

create policy profiles_update_own on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy accounts_select on public.accounts
for select to authenticated
using (public.is_account_member(id));

create policy accounts_update on public.accounts
for update to authenticated
using (public.is_account_member(id))
with check (public.is_account_member(id));

create policy account_members_select on public.account_members
for select to authenticated
using (public.is_account_member(account_id));

create policy categories_select on public.categories
for select to authenticated
using (public.is_category_visible(id));

create policy category_accounts_select on public.category_accounts
for select to authenticated
using (public.is_account_member(account_id) or public.is_category_visible(category_id));

create policy transactions_select on public.transactions
for select to authenticated
using (
  public.is_account_member(account_id)
  or (counterparty_account_id is not null and public.is_account_member(counterparty_account_id))
);

create policy transactions_insert on public.transactions
for insert to authenticated
with check (
  public.is_account_member(account_id)
  and created_by = (select auth.uid())
  and (
    counterparty_account_id is null
    or public.is_account_member(counterparty_account_id)
  )
);

create policy transactions_update on public.transactions
for update to authenticated
using (public.is_account_member(account_id))
with check (public.is_account_member(account_id));

create policy income_occurrences_select on public.income_occurrences
for select to authenticated
using (
  exists (
    select 1 from public.income_rules ir
    where ir.id = income_rule_id and public.is_account_member(ir.account_id)
  )
);

create policy income_rules_select on public.income_rules
for select to authenticated
using (public.is_account_member(account_id));

create policy income_rules_insert on public.income_rules
for insert to authenticated
with check (public.is_account_member(account_id));

create policy income_rules_update on public.income_rules
for update to authenticated
using (public.is_account_member(account_id))
with check (public.is_account_member(account_id));

create policy income_rules_delete on public.income_rules
for delete to authenticated
using (public.is_account_member(account_id));

create policy purchases_select on public.purchases
for select to authenticated
using (public.is_account_member(account_id));

create policy purchases_insert on public.purchases
for insert to authenticated
with check (
  public.is_account_member(account_id)
  and created_by = (select auth.uid())
);

create policy purchases_update on public.purchases
for update to authenticated
using (public.is_account_member(account_id))
with check (public.is_account_member(account_id));

alter table public.accounts replica identity full;
alter table public.account_members replica identity full;
alter table public.categories replica identity full;
alter table public.category_accounts replica identity full;
alter table public.transactions replica identity full;
alter table public.income_occurrences replica identity full;
alter table public.income_rules replica identity full;
alter table public.purchases replica identity full;
alter table public.profiles replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.account_members;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.category_accounts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.income_occurrences;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.income_rules;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.purchases;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

revoke execute on function public.create_account(text, numeric, uuid[]) from anon, public;
revoke execute on function public.share_account(uuid) from anon, public;
revoke execute on function public.join_account(text) from anon, public;
revoke execute on function public.leave_account(uuid) from anon, public;
revoke execute on function public.upsert_category(text, text, text, text, uuid[], uuid) from anon, public;
revoke execute on function public.set_account_categories(uuid, uuid[]) from anon, public;
revoke execute on function public.delete_category(uuid) from anon, public;
revoke execute on function public.transfer_between_accounts(uuid, uuid, numeric, date, text) from anon, public;
revoke execute on function public.complete_purchase(uuid) from anon, public;
revoke execute on function public.apply_due_income_rules(date) from anon, public;
revoke execute on function public.skip_income_occurrence(uuid) from anon, public;
revoke execute on function public.adjust_income_occurrence(uuid, numeric) from anon, public;
revoke execute on function public.ensure_profile() from anon, public;
