---
name: supabase-feature
description: Adds Supabase tables, RLS, and client wiring for household-scoped features. Use when creating migrations, invite join, balance/purchases/income_rules persistence, or Realtime.
---

# Supabase feature

## Steps

1. Write migration in `supabase/migrations/` (tables + indexes).
2. Enable RLS; policies: access iff user is member of row's `household_id`.
3. Invite join: RPC or safe path validating `invite_code` — do not open writes broadly.
4. Regenerate/update DB types used by the app.
5. Client calls from slice `api/` via shared Supabase client (`shared/api` or similar).
6. Subscribe Realtime only to current household channels/filters.
7. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only in the SPA.

## Checklist

- [ ] Migration applied locally
- [ ] RLS tested for non-member denial
- [ ] No `service_role` in frontend
- [ ] Feature layer uses typed client, not ad-hoc SQL strings in UI
