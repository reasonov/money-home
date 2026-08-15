create or replace function public.sync_manual_transaction_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source <> 'manual' or new.kind not in ('expense', 'income') or new.status <> 'posted' then
    return new;
  end if;

  if new.kind = 'expense' then
    update public.accounts
    set amount = amount - new.amount, updated_by = new.created_by
    where id = new.account_id;
  else
    update public.accounts
    set amount = amount + new.amount, updated_by = new.created_by
    where id = new.account_id;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_sync_manual_balance on public.transactions;
create trigger transactions_sync_manual_balance
after insert on public.transactions
for each row execute function public.sync_manual_transaction_balance();
