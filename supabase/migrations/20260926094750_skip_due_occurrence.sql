create or replace function public.skip_due_income(p_rule_id uuid, p_occurred_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.income_rules;
  v_occ_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rule from public.income_rules where id = p_rule_id;
  if v_rule.id is null or not public.is_account_member(v_rule.account_id) then
    raise exception 'Not an account member';
  end if;

  insert into public.income_occurrences (income_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'skipped')
  on conflict (income_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is not null then
    return;
  end if;

  select id into v_occ_id
  from public.income_occurrences
  where income_rule_id = p_rule_id and occurred_on = p_occurred_on;

  perform public.skip_income_occurrence(v_occ_id);
end;
$$;

revoke all on function public.skip_due_income(uuid, date) from public, anon;
grant execute on function public.skip_due_income(uuid, date) to authenticated;

create or replace function public.skip_due_expense(p_rule_id uuid, p_occurred_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.expense_rules;
  v_occ_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rule from public.expense_rules where id = p_rule_id;
  if v_rule.id is null or not public.is_account_member(v_rule.account_id) then
    raise exception 'Not an account member';
  end if;

  insert into public.expense_occurrences (expense_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'skipped')
  on conflict (expense_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is not null then
    return;
  end if;

  select id into v_occ_id
  from public.expense_occurrences
  where expense_rule_id = p_rule_id and occurred_on = p_occurred_on;

  perform public.skip_expense_occurrence(v_occ_id);
end;
$$;

revoke all on function public.skip_due_expense(uuid, date) from public, anon;
grant execute on function public.skip_due_expense(uuid, date) to authenticated;

create or replace function public.skip_due_transfer(p_rule_id uuid, p_occurred_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.transfer_rules;
  v_occ_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_rule from public.transfer_rules where id = p_rule_id;
  if v_rule.id is null
    or not public.is_account_member(v_rule.from_account_id)
    or not public.is_account_member(v_rule.to_account_id)
  then
    raise exception 'Not an account member';
  end if;

  insert into public.transfer_occurrences (transfer_rule_id, occurred_on, status)
  values (p_rule_id, p_occurred_on, 'skipped')
  on conflict (transfer_rule_id, occurred_on) do nothing
  returning id into v_occ_id;

  if v_occ_id is not null then
    return;
  end if;

  select id into v_occ_id
  from public.transfer_occurrences
  where transfer_rule_id = p_rule_id and occurred_on = p_occurred_on;

  perform public.skip_transfer_occurrence(v_occ_id);
end;
$$;

revoke all on function public.skip_due_transfer(uuid, date) from public, anon;
grant execute on function public.skip_due_transfer(uuid, date) to authenticated;
