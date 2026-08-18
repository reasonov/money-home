---
name: implement-from-spec
description: Implements a money-home feature from docs/SPEC.md with minimal diff. Use when the user asks to build a v1 feature from the product spec.
---

# Implement from SPEC

1. Open **only** the SPEC section that matches the task (Domain, Projection, Product surface, Design, Non-Goals). Do not treat Product surface as a backlog.
2. Load `balance-projection`, `fsd-slice`, or `supabase-feature` only if this task needs them.
3. Smallest vertical slice. Do not implement adjacent bullets or Non-Goals.
4. UI copy Russian; identifiers English.
5. Tests: only if the change touches pure money/date/sync helpers.

## Done when

- The requested SPEC contract is met
- FSD boundaries respected
- No secrets committed
- `npm run type-check`; `npm run test:unit` if helpers were touched
