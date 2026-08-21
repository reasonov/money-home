import { describe, expect, it } from 'vitest'
import {
  buildInsightCategories,
  buildInsightLevers,
  fallbackTipsFromLevers,
  forecastMinBalance,
} from '../buildInsightLevers'

const cafe = {
  name: 'Кафе',
  categoryId: 'cat-cafe',
  current: 8000,
  previous: 3000,
  delta: 5000,
  currentCount: 12,
  previousCount: 5,
}

const food = {
  name: 'Продукты',
  categoryId: 'cat-food',
  current: 15000,
  previous: 14800,
  delta: 200,
  currentCount: 20,
  previousCount: 19,
}

describe('buildInsightCategories', () => {
  it('diffs expense totals by category name', () => {
    const rows = buildInsightCategories(
      [
        { kind: 'expense', amount: 400, categoryId: 'c1', categoryName: 'Кафе' },
        { kind: 'expense', amount: 200, categoryId: 'c1', categoryName: 'Кафе' },
        { kind: 'income', amount: 1000, categoryName: 'Зарплата' },
      ],
      [{ kind: 'expense', amount: 100, categoryId: 'c1', categoryName: 'Кафе' }],
    )
    expect(rows).toEqual([
      {
        name: 'Кафе',
        categoryId: 'c1',
        current: 600,
        previous: 100,
        delta: 500,
        currentCount: 2,
        previousCount: 1,
      },
    ])
  })
})

describe('forecastMinBalance', () => {
  it('returns the lowest negative slice', () => {
    expect(
      forecastMinBalance([
        { date: '2026-08-21', balance: 100 },
        { date: '2026-08-25', balance: -40 },
        { date: '2026-08-30', balance: -10 },
      ]),
    ).toEqual({ balance: -40, date: '2026-08-25' })
  })

  it('returns null when the series stays non-negative', () => {
    expect(forecastMinBalance([{ date: '2026-08-21', balance: 0 }])).toBeNull()
  })
})

describe('buildInsightLevers', () => {
  it('returns nothing without a previous period or a forecast dip', () => {
    expect(
      buildInsightLevers({
        period: 'month',
        hasPrevious: false,
        scopeLabel: 'на этом счёте',
        currentExpense: 20000,
        categories: [cafe],
        topExpenses: [],
      }),
    ).toEqual([])
  })

  it('skips category levers for all-time unless forecast dips', () => {
    const empty = buildInsightLevers({
      period: 'all',
      hasPrevious: true,
      scopeLabel: 'на этом счёте',
      currentExpense: 20000,
      categories: [cafe],
      topExpenses: [{ id: 't1', amount: 9000, categoryName: 'Кафе', occurredOn: '2026-08-01' }],
    })
    expect(empty).toEqual([])

    const withDip = buildInsightLevers({
      period: 'all',
      hasPrevious: true,
      scopeLabel: 'на этом счёте',
      currentExpense: 20000,
      categories: [cafe],
      topExpenses: [],
      forecastMin: { balance: -1200, date: '2026-09-10' },
    })
    expect(withDip).toHaveLength(1)
    expect(withDip[0]?.kind).toBe('forecast_dip')
    expect(withDip[0]?.fact).toContain('10.09.2026')
    expect(withDip[0]?.fact).not.toContain('2026-09-10')
  })

  it('ranks a category spike and a large operation', () => {
    const levers = buildInsightLevers({
      period: 'month',
      hasPrevious: true,
      scopeLabel: 'на этом счёте',
      currentExpense: 23000,
      categories: [cafe, food],
      topExpenses: [
        {
          id: 'tx-1',
          amount: 9000,
          categoryId: 'cat-food',
          categoryName: 'Продукты',
          occurredOn: '2026-08-10',
        },
      ],
    })
    expect(levers.some((item) => item.kind === 'category_increase' && item.categoryId === 'cat-cafe')).toBe(
      true,
    )
    expect(levers.some((item) => item.kind === 'large_operation' && item.transactionId === 'tx-1')).toBe(
      true,
    )
    expect(levers.some((item) => item.id === 'increase:Кафе' && item.kind === 'category_top')).toBe(false)
    const tips = fallbackTipsFromLevers(levers, 2)
    expect(tips[0]?.detail).toContain('Кафе')
  })
})
