---
name: implement-from-spec
description: Implements a money-home feature from docs/SPEC.md with minimal diff and acceptance checks. Use when the user asks to build a v1 feature from the product spec.
---

# Implement from SPEC

## Workflow

1. Read relevant sections of `docs/SPEC.md` and list Acceptance Criteria for this task only.
2. Load matching skills (`balance-projection`, `fsd-slice`, `supabase-feature`) when applicable.
3. Implement the smallest vertical slice: UI + domain + persistence if required.
4. Do not expand into Non-Goals (v1).
5. If balance math is touched, add/adjust unit tests for the projection helper.
6. Keep UI copy in Russian; identifiers in English.

## Done when

- [ ] SPEC AC for the task satisfied
- [ ] FSD boundaries respected
- [ ] No secrets committed
- [ ] `npm run type-check` / relevant tests pass for touched code
