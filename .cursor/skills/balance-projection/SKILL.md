---
name: balance-projection
description: Implements and tests per-account balance projection for purchase affordability by date. Use when working on canAfford, projected balance, income rules, planned purchases, or transfer suggestions.
---

# Balance projection

## When

Any change to affordability, income schedules, planned purchases calendar, auto-income occurrences, or transfer suggestions.

## Spec source

Read `docs/SPEC.md` § Balance Projection Algorithm first.

## Algorithm (must match SPEC)

```
projected = currentBalance
           + sum(future incomes on d where asOf < d <= target and no occurrence)
           - sum(planned purchases on d where asOf < d <= target)
canAfford = projected >= candidateAmount
```

Purchases dated `asOfDate` are excluded (already in account balance). Posted auto-income is already in `currentBalance`.

## Implementation checklist

1. Keep logic pure in `shared` (no Supabase calls inside). Scope one account.
2. Cover frequencies: `weekly`, `biweekly` (+ anchor), `monthly` (day 1–28).
3. Exclude `postedOccurrenceDates` from future income sums.
4. On fail, return breakdown plus `suggestTransfer` candidates from other accounts the user can spend from.
5. UI: short `message` in banner; full refusal in bottom drawer; transfer CTA when surplus ≥ shortfall.
6. Add/update Vitest cases (curtain fixture, exclude self, skipped dates, transfer suggestion).

## Fixture

- Candidate: title «штора», 2300 RUB, target 25 Aug.
- If projected is 1500 → reject, do not insert purchase.
