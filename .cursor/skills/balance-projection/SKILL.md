---
name: balance-projection
description: Implements and tests per-account balance projection for purchase affordability by date. Use when working on canAfford, projected balance, income rules, expense rules, planned purchases, or transfer suggestions.
---

# Balance projection

Read `docs/SPEC.md` § Balance Projection Algorithm. Do not re-derive the formula.

1. Keep logic in `shared` (`projectBalance` and due-date helpers). No I/O. One account.
2. Frequencies: `weekly`, `biweekly` (+ anchor), `monthly` (day 1–28). Skip dates with an occurrence.
3. On `!canAfford`: breakdown + `suggestTransfer` from the user's other accounts when surplus ≥ shortfall.
4. UI: short `message` in banner; full refusal in drawer; transfer CTA when applicable.
5. Update Vitest in `src/shared/lib/__tests__/projectBalance.spec.ts` (curtain fixture, exclude self, skipped dates, expense rules, transfer). Run `npm run test:unit`.

Fixture: «штора», 2300 ₽, 25 Aug; projected 1500 → reject, do not insert.
