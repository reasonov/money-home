---
name: supabase-feature
description: Adds Supabase tables, RLS, and client wiring for account-scoped features. Use when creating migrations, account join, transactions/purchases/income_rules persistence, or Realtime.
---

# Supabase feature

RLS and client conventions live in the Supabase rule. This skill is only for **adding** persistence.

1. Migration in `supabase/migrations/` (tables + indexes).
2. Enable RLS using existing account-membership / category-link patterns. Join-by-code stays an RPC.
3. Regenerate DB types. Client calls from slice `api/` via the shared typed client — no ad-hoc SQL in UI.
4. Realtime only for the current user's accounts.
5. SPA env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only.
