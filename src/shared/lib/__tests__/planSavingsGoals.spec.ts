import { describe, expect, it } from 'vitest'
import { parseLocalDate } from '../dates'
import {
  planSavingsGoals,
  SAVINGS_AVERAGE_WINDOW_DAYS,
  SAVINGS_DAYS_PER_MONTH,
} from '../planSavingsGoals'
import { roundMoney } from '../parseAmount'

function daysBetween(fromIso: string, toIso: string) {
  const from = parseLocalDate(fromIso)
  const to = parseLocalDate(toIso)
  let days = 0
  let cursor = from
  while (cursor.getTime() < to.getTime()) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    days += 1
  }
  return days
}

function monthsBetween(fromIso: string, toIso: string) {
  return Math.max(daysBetween(fromIso, toIso) / SAVINGS_DAYS_PER_MONTH, 1 / 30)
}

function observedHistoryDays(firstIso: string, asOfIso: string) {
  return Math.min(
    SAVINGS_AVERAGE_WINDOW_DAYS,
    Math.max(daysBetween(firstIso, asOfIso) + 1, SAVINGS_DAYS_PER_MONTH),
  )
}

describe('planSavingsGoals', () => {
  it('uses remaining / months when there is no history', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-01-01'),
      goals: [
        {
          id: 'g1',
          title: 'Отпуск',
          targetAmount: 10000,
          targetDate: '2026-02-01',
          savedAmount: 0,
          startedOn: '2026-01-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.historyDays).toBe(0)
    expect(result.avgMonthlyManualNet).toBe(0)
    expect(result.extraPerMonth).toBe(roundMoney(10000 / monthsBetween('2026-01-01', '2026-02-01')))
    expect(result.goals[0]?.onTrack).toBe(false)
    expect(result.message).toContain('дополнительно вносить')
  })

  it('treats no history as zero discretionary net', () => {
    const result = planSavingsGoals({
      currentBalance: 50000,
      asOfDate: parseLocalDate('2026-08-01'),
      goals: [
        {
          targetAmount: 40000,
          targetDate: '2026-08-31',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.historyDays).toBe(0)
    expect(result.avgMonthlyManualIncome).toBe(0)
    expect(result.avgMonthlyManualExpense).toBe(0)
    expect(result.extraPerMonth).toBe(0)
    expect(result.onTrack).toBe(true)
    expect(result.goals[0]?.message).toBe('Укладываемся')
  })

  it('counts future income rules toward the goal when there is no history', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-01'),
      goals: [
        {
          targetAmount: 10000,
          targetDate: '2026-08-31',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [{ amount: 10000, frequency: 'monthly', monthDay: 10, active: true }],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.incomeRuleTotal).toBe(10000)
    expect(result.extraPerMonth).toBe(0)
    expect(result.goals[0]?.coveredByDate).toBe(true)
    expect(result.goals[0]?.onTrack).toBe(true)
  })

  it('subtracts planned purchases from surplus', () => {
    const result = planSavingsGoals({
      currentBalance: 20000,
      asOfDate: parseLocalDate('2026-08-01'),
      goals: [
        {
          targetAmount: 20000,
          targetDate: '2026-08-31',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [
        {
          id: 'p1',
          title: 'Стул',
          amount: 15000,
          plannedDate: '2026-08-15',
          status: 'planned',
        },
      ],
      transactions: [],
    })

    expect(result.plannedSpend).toBe(15000)
    expect(result.extraPerMonth).toBe(
      roundMoney(15000 / monthsBetween('2026-08-01', '2026-08-31')),
    )
    expect(result.goals[0]?.coveredByDate).toBe(false)
  })

  it('counts posted income from rules and purchases in the average', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-20'),
      accountId: 'acc',
      goals: [
        {
          targetAmount: 100000,
          targetDate: '2026-11-20',
          savedAmount: 0,
          startedOn: '2026-08-20',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [
        {
          amount: 90000,
          kind: 'expense',
          source: 'manual',
          status: 'posted',
          occurredOn: '2026-07-01',
          accountId: 'acc',
        },
        {
          amount: 50000,
          kind: 'income',
          source: 'income_rule',
          status: 'posted',
          occurredOn: '2026-07-10',
          accountId: 'acc',
        },
        {
          amount: 12000,
          kind: 'expense',
          source: 'purchase',
          status: 'posted',
          occurredOn: '2026-07-12',
          accountId: 'acc',
        },
      ],
    })

    const historyDays = observedHistoryDays('2026-07-01', '2026-08-20')
    expect(result.historyDays).toBe(historyDays)
    expect(result.avgMonthlyManualIncome).toBe(
      roundMoney((50000 / historyDays) * SAVINGS_DAYS_PER_MONTH),
    )
    expect(result.avgMonthlyManualExpense).toBe(
      roundMoney((102000 / historyDays) * SAVINGS_DAYS_PER_MONTH),
    )
    expect(result.incomeRuleTotal).toBe(0)
  })

  it('prefers actual deposits over future income rules', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-01'),
      accountId: 'acc',
      goals: [
        {
          targetAmount: 100000,
          targetDate: '2026-11-01',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [{ amount: 100000, frequency: 'monthly', monthDay: 10, active: true }],
      plannedPurchases: [],
      transactions: [
        {
          amount: 10000,
          kind: 'income',
          source: 'income_rule',
          status: 'posted',
          occurredOn: '2026-07-10',
          accountId: 'acc',
        },
      ],
    })

    expect(result.historyDays).toBe(SAVINGS_DAYS_PER_MONTH)
    expect(result.incomeRuleTotal).toBe(0)
    expect(result.avgMonthlyManualIncome).toBe(10000)
    expect(result.extraPerMonth).toBeGreaterThan(20000)
  })

  it('counts outbound transfers as manual expense', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-20'),
      accountId: 'acc',
      goals: [],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [
        {
          amount: 9000,
          kind: 'transfer',
          source: 'manual',
          status: 'posted',
          occurredOn: '2026-07-01',
          accountId: 'acc',
          counterpartyAccountId: 'other',
        },
      ],
    })

    const historyDays = observedHistoryDays('2026-07-01', '2026-08-20')
    expect(result.avgMonthlyManualExpense).toBe(
      roundMoney((9000 / historyDays) * SAVINGS_DAYS_PER_MONTH),
    )
    expect(result.avgMonthlyManualIncome).toBe(0)
  })

  it('treats less than a month of history as one month', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-20'),
      accountId: 'acc',
      goals: [],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [
        {
          amount: 100000,
          kind: 'income',
          source: 'manual',
          status: 'posted',
          occurredOn: '2026-08-10',
          accountId: 'acc',
        },
      ],
    })

    expect(result.historyDays).toBe(SAVINGS_DAYS_PER_MONTH)
    expect(result.avgMonthlyManualIncome).toBe(100000)
    expect(result.avgMonthlyManualExpense).toBe(0)
  })

  it('covers earlier goals first when several share the same surplus', () => {
    const result = planSavingsGoals({
      currentBalance: 10000,
      asOfDate: parseLocalDate('2026-08-01'),
      goals: [
        {
          id: 'soon',
          title: 'Ноутбук',
          targetAmount: 10000,
          targetDate: '2026-08-31',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
        {
          id: 'later',
          title: 'Отпуск',
          targetAmount: 10000,
          targetDate: '2026-10-01',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.goals[0]?.id).toBe('soon')
    expect(result.goals[0]?.coveredByDate).toBe(true)
    expect(result.goals[0]?.extraPerMonth).toBe(0)
    expect(result.goals[1]?.id).toBe('later')
    expect(result.goals[1]?.coveredByDate).toBe(false)
    expect(result.extraPerMonth).toBe(
      roundMoney(10000 / monthsBetween('2026-08-01', '2026-10-01')),
    )
  })

  it('warns when labeled savings exceed the balance', () => {
    const result = planSavingsGoals({
      currentBalance: 3000,
      asOfDate: parseLocalDate('2026-08-01'),
      goals: [
        {
          targetAmount: 10000,
          targetDate: '2026-12-01',
          savedAmount: 5000,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.overAllocated).toBe(true)
    expect(result.labeledTotal).toBe(5000)
  })

  it('marks an overdue goal when the date has passed', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-20'),
      goals: [
        {
          targetAmount: 5000,
          targetDate: '2026-08-01',
          savedAmount: 0,
          startedOn: '2026-06-01',
        },
      ],
      incomeRules: [],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.goals[0]?.overdue).toBe(true)
    expect(result.goals[0]?.onTrack).toBe(false)
    expect(result.goals[0]?.message).toContain('Срок вышел')
    expect(result.extraPerMonth).toBe(150000)
  })

  it('is not on track when linear progress lags even if cashflow covers the date', () => {
    const result = planSavingsGoals({
      currentBalance: 0,
      asOfDate: parseLocalDate('2026-08-16'),
      goals: [
        {
          targetAmount: 50000,
          targetDate: '2026-08-31',
          savedAmount: 0,
          startedOn: '2026-08-01',
        },
      ],
      incomeRules: [{ amount: 50000, frequency: 'monthly', monthDay: 28, active: true }],
      plannedPurchases: [],
      transactions: [],
    })

    expect(result.goals[0]?.coveredByDate).toBe(true)
    expect(result.goals[0]?.onTrack).toBe(false)
    expect(result.goals[0]?.message).toBe('Не укладываемся')
    expect(result.extraPerMonth).toBe(0)
  })
})
