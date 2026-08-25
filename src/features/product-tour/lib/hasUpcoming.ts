import { ALL_ACCOUNTS_ID } from '@/entities/account'
import type { ExpenseRule } from '@/entities/expense-rule'
import type { IncomeRule } from '@/entities/income-rule'
import type { Purchase } from '@/entities/purchase'
import {
  addDays,
  formatLocalDate,
  incomeOccurrences,
  isPastDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'

export function hasUpcomingEvents(input: {
  selectedAccountId: string
  planned: Purchase[]
  incomeRules: IncomeRule[]
  expenseRules: ExpenseRule[]
  occurrenceDatesFor: (ruleId: string) => string[]
  expenseOccurrenceDatesFor: (ruleId: string) => string[]
}): boolean {
  const today = todayLocal()
  const asOf = parseLocalDate(today)
  const horizon = addDays(asOf, 7)
  const yesterday = addDays(asOf, -1)
  const selected = input.selectedAccountId

  const purchases =
    selected === ALL_ACCOUNTS_ID
      ? input.planned
      : input.planned.filter((item) => item.accountId === selected)

  for (const item of purchases) {
    if (!item.plannedDate) {
      continue
    }
    if (isPastDate(item.plannedDate, today)) {
      return true
    }
    if (item.plannedDate >= today && item.plannedDate <= formatLocalDate(horizon)) {
      return true
    }
  }

  const incomeRules =
    selected === ALL_ACCOUNTS_ID
      ? input.incomeRules.filter((rule) => rule.active)
      : input.incomeRules.filter((rule) => rule.active && rule.accountId === selected)

  for (const rule of incomeRules) {
    if (incomeOccurrences(rule, yesterday, horizon, input.occurrenceDatesFor(rule.id)).length) {
      return true
    }
  }

  const expenseRules =
    selected === ALL_ACCOUNTS_ID
      ? input.expenseRules.filter((rule) => rule.active)
      : input.expenseRules.filter((rule) => rule.active && rule.accountId === selected)

  for (const rule of expenseRules) {
    if (
      incomeOccurrences(rule, yesterday, horizon, input.expenseOccurrenceDatesFor(rule.id)).length
    ) {
      return true
    }
  }

  return false
}
