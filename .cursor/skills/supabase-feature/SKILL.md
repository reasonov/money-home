---
name: supabase-feature
description: Adds Supabase tables, RLS, and client wiring for account-scoped features. Use when creating migrations, account join, transactions/purchases/income_rules persistence, or Realtime.
---

# Supabase feature

## Steps

1. Write migration in `supabase/migrations/` (tables + indexes).
2. Enable RLS; policies: access iff user is member of the row's account.
3. Account join: RPC validating `invite_code` — do not open writes broadly.
4. Categories: member of at least one linked account.
5. Regenerate/update DB types used by the app.
6. Client calls from slice `api/` via shared Supabase client.
7. Subscribe Realtime only to the current user's accounts.
8. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only in the SPA.

## Checklist

- [ ] Migration applied locally
- [ ] RLS tested for non-member denial
- [ ] No `service_role` in frontend
- [ ] Feature layer uses typed client, not ad-hoc SQL strings in UI
