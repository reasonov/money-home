import { describe, expect, it } from 'vitest'
import { parseLocalDate } from '@/shared'
import {
  summarizeSpendingForAdvice,
  type SavingsAdviceGoalFact,
  type SavingsAdviceTransaction,
} from '../summarizeSpending'

const goal: Omit<SavingsAdviceGoalFact, 'monthsLeft'> = {
  title: 'Отпуск',
  remaining: 40000,
  extraPerMonth: 8000,
  targetDate: '2026-12-01',
  savedAmount: 10000,
  targetAmount: 50000,
  overdue: false,
  message: 'Не укладываемся, ещё 8 000 ₽/мес',
}

function tx(
  partial: Pick<SavingsAdviceTransaction, 'amount' | 'occurredOn'> &
    Partial<SavingsAdviceTransaction>,
): SavingsAdviceTransaction {
  return {
    kind: 'expense',
    status: 'posted',
    accountId: 'a1',
    ...partial,
  }
}

describe('summarizeSpendingForAdvice', () => {
  it('splits posted expenses into last 30 days vs previous 30', () => {
    const result = summarizeSpendingForAdvice({
      accountId: 'a1',
      asOfDate: parseLocalDate('2026-08-20'),
      goal,
      avgMonthlyManualExpense: 45000,
      plannedSpend: 3000,
      transactions: [
        tx({ amount: 500, occurredOn: '2026-08-20', categoryName: 'Алкоголь' }),
        tx({ amount: 200, occurredOn: '2026-07-22', categoryName: 'Алкоголь' }),
        tx({ amount: 100, occurredOn: '2026-07-21', categoryName: 'Алкоголь' }),
        tx({ amount: 80, occurredOn: '2026-06-22', categoryName: 'Алкоголь' }),
        tx({ amount: 50, occurredOn: '2026-06-21', categoryName: 'Алкоголь' }),
      ],
    })

    expect(result.currentTotal).toBe(700)
    expect(result.previousTotal).toBe(180)
    expect(result.categories).toEqual([
      {
        name: 'Алкоголь',
        current: 700,
        previous: 180,
        delta: 520,
        currentCount: 2,
        previousCount: 2,
      },
    ])
    expect(result.increases).toEqual([
      {
        name: 'Алкоголь',
        current: 700,
        previous: 180,
        delta: 520,
        currentCount: 2,
        previousCount: 2,
      },
    ])
  })

  it('ignores income, transfers, other accounts and cancelled rows', () => {
    const result = summarizeSpendingForAdvice({
      accountId: 'a1',
      asOfDate: parseLocalDate('2026-08-20'),
      goal,
      avgMonthlyManualExpense: 0,
      plannedSpend: 0,
      transactions: [
        tx({ amount: 100, occurredOn: '2026-08-10', categoryName: 'Еда' }),
        tx({ amount: 999, occurredOn: '2026-08-10', categoryName: 'Еда', kind: 'income' }),
        tx({ amount: 999, occurredOn: '2026-08-10', categoryName: 'Еда', kind: 'transfer' }),
        tx({ amount: 999, occurredOn: '2026-08-10', categoryName: 'Еда', status: 'cancelled' }),
        tx({ amount: 999, occurredOn: '2026-08-10', categoryName: 'Еда', accountId: 'a2' }),
      ],
    })

    expect(result.currentTotal).toBe(100)
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]?.name).toBe('Еда')
  })

  it('uses Без категории when the name is empty', () => {
    const result = summarizeSpendingForAdvice({
      accountId: 'a1',
      asOfDate: parseLocalDate('2026-08-20'),
      goal,
      avgMonthlyManualExpense: 0,
      plannedSpend: 0,
      transactions: [
        tx({ amount: 40, occurredOn: '2026-08-01' }),
        tx({ amount: 10, occurredOn: '2026-08-02', categoryName: '  ' }),
      ],
    })

    expect(result.categories).toEqual([
      {
        name: 'Без категории',
        current: 50,
        previous: 0,
        delta: 50,
        currentCount: 2,
        previousCount: 0,
      },
    ])
  })

  it('keeps top categories by current spend and top positive deltas', () => {
    const transactions = [
      ...Array.from({ length: 12 }, (_, index) =>
        tx({
          amount: 200 - index,
          occurredOn: '2026-08-10',
          categoryName: `Кат ${String(index).padStart(2, '0')}`,
        }),
      ),
      tx({ amount: 400, occurredOn: '2026-08-10', categoryName: 'Алкоголь' }),
      tx({ amount: 50, occurredOn: '2026-07-01', categoryName: 'Алкоголь' }),
      tx({ amount: 200, occurredOn: '2026-07-01', categoryName: 'Кат 00' }),
    ]

    const result = summarizeSpendingForAdvice({
      accountId: 'a1',
      asOfDate: parseLocalDate('2026-08-20'),
      goal,
      avgMonthlyManualExpense: 0,
      plannedSpend: 0,
      transactions,
    })

    expect(result.categories).toHaveLength(8)
    expect(result.categories[0]?.name).toBe('Алкоголь')
    expect(result.categories.map((row) => row.name)).not.toContain('Кат 11')
    expect(result.increases[0]).toEqual({
      name: 'Алкоголь',
      current: 400,
      previous: 50,
      delta: 350,
      currentCount: 1,
      previousCount: 1,
    })
    expect(result.increases.some((row) => row.name === 'Кат 00')).toBe(false)
  })
})
