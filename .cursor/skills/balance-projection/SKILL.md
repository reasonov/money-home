---
name: balance-projection
description: Implements and tests household balance projection for purchase affordability by date. Use when working on canAfford, projected balance, income rules, planned purchases, or the curtain/date example from the spec.
---

# Balance projection

## When

Any change to affordability, income schedules, planned purchases calendar, or balance math.

## Spec source

Read `docs/SPEC.md` § Balance Projection Algorithm first.

## Algorithm (must match SPEC)

```
projected = currentBalance
           + sum(incomes on d where asOf < d <= target)
           - sum(planned purchases on d where asOf < d <= target)
canAfford = projected >= candidateAmount
```

Purchases dated `asOfDate` are excluded (already in manual balance).

## Implementation checklist

1. Keep logic pure in `shared` or `entities` (no Supabase calls inside).
2. Cover frequencies: `weekly`, `biweekly` (+ anchor), `monthly` (day 1–28).
3. On fail, return breakdown: `shortfall`, `plannedBeforeTarget`, `incomeTotal`, `incomeOccurrencesCount`, `nextAffordableDate` (scan day-by-day, horizon 365 days from `asOfDate`).
4. UI: short `message` in banner; full refusal in bottom drawer.
5. Add/update Vitest cases for the helper (including edit flow excluding self, nextAffordableDate, empty horizon).

## Fixture

- Candidate: title «штора», 2300 RUB, target 25 Aug.
- If projected is 1500 → reject, do not insert purchase.
