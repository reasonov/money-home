alter table public.accounts
  add column exclude_from_total boolean not null default false;
