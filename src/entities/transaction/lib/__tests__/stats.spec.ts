import { describe, expect, it } from 'vitest'
import { todayLocal } from '@/shared'
import type { Transaction } from '../../model/types'
import {
  averageDailyExpense,
  expensesByCategory,
  expensesByDay,
  expensesByWeekday,
  expenseShare,
  filterStatsTransactions,
  formatPeriodLabel,
  heatmapWeeks,
  heatmapWindow,
  periodDayCount,
  previousStatsDateRange,
  statsDateRange,
  statsSummary,
  topTransactions,
  totalsByAccount,
  totalsByCategory,
  totalsByMember,
  trendSeries,
  trendStepForRange,
} from '../stats'

function tx(
  partial: Pick<Transaction, 'id' | 'kind' | 'amount' | 'occurredOn'> & Partial<Transaction>,
): Transaction {
  return {
    accountId: 'a1',
    status: 'posted',
    source: 'manual',
    createdBy: 'u1',
    ...partial,
  }
}

describe('statsDateRange', () => {
  it('covers the current calendar month', () => {
    expect(statsDateRange('this_month', '2026-08-14')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('covers the previous calendar month across years', () => {
    expect(statsDateRange('last_month', '2026-01-15')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    })
  })

  it('covers 90 inclusive days ending on asOf', () => {
    expect(statsDateRange('days_90', '2026-08-14')).toEqual({
      from: '2026-05-17',
      to: '2026-08-14',
    })
  })

  it('has no bounds for all time', () => {
    expect(statsDateRange('all', '2026-08-14')).toEqual({})
  })

  it('covers a single day', () => {
    expect(statsDateRange('day', '2026-08-14')).toEqual({
      from: '2026-08-14',
      to: '2026-08-14',
    })
  })

  it('covers Monday-Sunday week', () => {
    expect(statsDateRange('week', '2026-08-14')).toEqual({
      from: '2026-08-10',
      to: '2026-08-16',
    })
  })

  it('covers the calendar year', () => {
    expect(statsDateRange('year', '2026-08-14')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    })
  })

  it('uses custom bounds and swaps inverted dates', () => {
    expect(statsDateRange('custom', '2026-08-14', { from: '2026-08-20', to: '2026-08-01' })).toEqual({
      from: '2026-08-01',
      to: '2026-08-20',
    })
  })
})

describe('filterStatsTransactions', () => {
  const items: Transaction[] = [
    tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
    tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05' }),
    tx({ id: 't1', kind: 'transfer', amount: 50, occurredOn: '2026-08-10' }),
    tx({ id: 'e2', kind: 'expense', amount: 200, occurredOn: '2026-07-20', accountId: 'a2' }),
    tx({ id: 'e3', kind: 'expense', amount: 80, occurredOn: '2026-05-16' }),
    tx({
      id: 'e4',
      kind: 'expense',
      amount: 30,
      occurredOn: '2026-08-01',
      status: 'cancelled',
    }),
  ]

  it('drops transfers and cancelled rows', () => {
    const result = filterStatsTransactions(items, {
      accountId: 'all',
      period: 'all',
      asOf: '2026-08-14',
    })
    expect(result.map((item) => item.id)).toEqual(['e1', 'i1', 'e2', 'e3'])
  })

  it('filters by account', () => {
    const result = filterStatsTransactions(items, {
      accountId: 'a2',
      period: 'all',
      asOf: '2026-08-14',
    })
    expect(result.map((item) => item.id)).toEqual(['e2'])
  })

  it('filters this month', () => {
    const result = filterStatsTransactions(items, {
      accountId: 'all',
      period: 'this_month',
      asOf: '2026-08-14',
    })
    expect(result.map((item) => item.id)).toEqual(['e1', 'i1'])
  })

  it('filters last 90 days inclusively', () => {
    const result = filterStatsTransactions(items, {
      accountId: 'all',
      period: 'days_90',
      asOf: '2026-08-14',
    })
    expect(result.map((item) => item.id)).toEqual(['e1', 'i1', 'e2'])
  })

  it('filters a custom range', () => {
    const result = filterStatsTransactions(items, {
      accountId: 'all',
      period: 'custom',
      from: '2026-08-05',
      to: '2026-08-10',
      asOf: '2026-08-14',
    })
    expect(result.map((item) => item.id)).toEqual(['e1', 'i1'])
  })
})

describe('statsSummary', () => {
  it('sums expenses and income', () => {
    expect(
      statsSummary([
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
        tx({ id: 'e2', kind: 'expense', amount: 40, occurredOn: '2026-08-11' }),
        tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05' }),
      ]),
    ).toEqual({ expenseTotal: 140, incomeTotal: 500, net: 360 })
  })
})

describe('totalsByCategory', () => {
  it('groups income separately from expenses', () => {
    const items = [
      tx({
        id: 'e1',
        kind: 'expense',
        amount: 100,
        occurredOn: '2026-08-10',
        categoryId: 'food',
        categoryName: 'Еда',
      }),
      tx({
        id: 'i1',
        kind: 'income',
        amount: 500,
        occurredOn: '2026-08-05',
        categoryId: 'salary',
        categoryName: 'Зарплата',
        categoryColor: '#0F766E',
      }),
      tx({
        id: 'i2',
        kind: 'income',
        amount: 200,
        occurredOn: '2026-08-06',
        categoryId: 'salary',
        categoryName: 'Зарплата',
        categoryColor: '#0F766E',
      }),
    ]

    expect(totalsByCategory(items, 'income')).toEqual([
      {
        categoryId: 'salary',
        name: 'Зарплата',
        color: '#0F766E',
        amount: 700,
      },
    ])
  })
})

describe('expensesByCategory', () => {
  it('groups, sorts by amount, and labels uncategorized', () => {
    const result = expensesByCategory([
      tx({
        id: 'e1',
        kind: 'expense',
        amount: 100,
        occurredOn: '2026-08-10',
        categoryId: 'food',
        categoryName: 'Еда',
        categoryColor: '#15803D',
      }),
      tx({
        id: 'e2',
        kind: 'expense',
        amount: 50,
        occurredOn: '2026-08-11',
        categoryId: 'food',
        categoryName: 'Еда',
        categoryColor: '#15803D',
      }),
      tx({ id: 'e3', kind: 'expense', amount: 80, occurredOn: '2026-08-12' }),
      tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05' }),
    ])

    expect(result).toEqual([
      {
        categoryId: 'food',
        name: 'Еда',
        color: '#15803D',
        amount: 150,
      },
      {
        categoryId: null,
        name: 'Без категории',
        amount: 80,
      },
    ])
  })
})

describe('expensesByWeekday', () => {
  it('returns Monday-Sunday totals', () => {
    const result = expensesByWeekday([
      tx({ id: 'mon', kind: 'expense', amount: 10, occurredOn: '2026-08-10' }),
      tx({ id: 'mon2', kind: 'expense', amount: 5, occurredOn: '2026-08-10' }),
      tx({ id: 'fri', kind: 'expense', amount: 40, occurredOn: '2026-08-14' }),
      tx({ id: 'inc', kind: 'income', amount: 100, occurredOn: '2026-08-10' }),
    ])

    expect(result.map((item) => item.label)).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'])
    expect(result.map((item) => item.amount)).toEqual([15, 0, 0, 0, 40, 0, 0])
  })
})

describe('previousStatsDateRange', () => {
  it('compares this month to the same days of the previous month', () => {
    expect(previousStatsDateRange('this_month', '2026-08-15')).toEqual({
      from: '2026-07-01',
      to: '2026-07-15',
    })
  })

  it('caps the previous month day when the month is shorter', () => {
    expect(previousStatsDateRange('this_month', '2026-03-31')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('compares this year to the same date last year', () => {
    expect(previousStatsDateRange('year', '2026-08-15')).toEqual({
      from: '2025-01-01',
      to: '2025-08-15',
    })
  })

  it('uses the month before last for last_month', () => {
    expect(previousStatsDateRange('last_month', '2026-08-15')).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    })
  })

  it('shifts a 90-day window back by the same length', () => {
    expect(previousStatsDateRange('days_90', '2026-08-14')).toEqual({
      from: '2026-02-16',
      to: '2026-05-16',
    })
  })

  it('has no previous range for all time', () => {
    expect(previousStatsDateRange('all', '2026-08-14')).toBeNull()
  })
})

describe('periodDayCount', () => {
  it('counts elapsed days of the current month', () => {
    expect(periodDayCount({ from: '2026-08-01', to: '2026-08-31' }, '2026-08-14')).toBe(14)
  })

  it('counts a completed previous month in full', () => {
    expect(periodDayCount({ from: '2026-07-01', to: '2026-07-31' }, '2026-08-14')).toBe(31)
  })

  it('uses the first transaction for all-time range', () => {
    expect(
      periodDayCount({}, '2026-08-14', [
        tx({ id: 'e1', kind: 'expense', amount: 10, occurredOn: '2026-06-01' }),
      ]),
    ).toBe(75)
  })
})

describe('averageDailyExpense', () => {
  it('divides spend by day count', () => {
    expect(averageDailyExpense(310, 10)).toBe(31)
  })
})

describe('expenseShare', () => {
  it('returns the expense to income ratio', () => {
    expect(expenseShare(50, 200)).toBe(0.25)
  })

  it('returns null without income', () => {
    expect(expenseShare(10, 0)).toBeNull()
  })
})

describe('totalsByAccount', () => {
  it('groups expense and income by account', () => {
    expect(
      totalsByAccount([
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10', accountId: 'a2' }),
        tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05', accountId: 'a1' }),
        tx({ id: 'e2', kind: 'expense', amount: 40, occurredOn: '2026-08-11', accountId: 'a1' }),
      ]),
    ).toEqual([
      { accountId: 'a1', expenseTotal: 40, incomeTotal: 500 },
      { accountId: 'a2', expenseTotal: 100, incomeTotal: 0 },
    ])
  })
})

describe('totalsByMember', () => {
  it('groups manual and purchase operations and skips auto rules', () => {
    expect(
      totalsByMember([
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10', createdBy: 'u1' }),
        tx({
          id: 'e2',
          kind: 'expense',
          amount: 40,
          occurredOn: '2026-08-11',
          createdBy: 'u2',
          source: 'purchase',
        }),
        tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05', createdBy: 'u2' }),
        tx({
          id: 'a1',
          kind: 'income',
          amount: 900,
          occurredOn: '2026-08-10',
          createdBy: 'u1',
          source: 'income_rule',
        }),
        tx({
          id: 'a2',
          kind: 'expense',
          amount: 80,
          occurredOn: '2026-08-10',
          createdBy: 'u1',
          source: 'expense_rule',
        }),
      ]),
    ).toEqual([
      { userId: 'u2', expenseTotal: 40, incomeTotal: 500 },
      { userId: 'u1', expenseTotal: 100, incomeTotal: 0 },
    ])
  })
})

describe('topTransactions', () => {
  it('returns the largest items of a kind', () => {
    const result = topTransactions(
      [
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
        tx({ id: 'e2', kind: 'expense', amount: 40, occurredOn: '2026-08-11' }),
        tx({ id: 'e3', kind: 'expense', amount: 80, occurredOn: '2026-08-12' }),
        tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-05' }),
      ],
      'expense',
      2,
    )
    expect(result.map((item) => item.id)).toEqual(['e1', 'e3'])
  })
})

describe('trendSeries', () => {
  it('uses daily buckets for a month and clamps to asOf', () => {
    expect(trendStepForRange({ from: '2026-08-01', to: '2026-08-31' }, '2026-08-14')).toBe('day')

    const series = trendSeries(
      [
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
        tx({ id: 'i1', kind: 'income', amount: 50, occurredOn: '2026-08-10' }),
      ],
      { from: '2026-08-01', to: '2026-08-31' },
      '2026-08-14',
    )

    expect(series).toHaveLength(14)
    expect(series[9]).toMatchObject({ key: '2026-08-10', expense: 100, income: 50 })
    expect(series[0]?.expense).toBe(0)
  })

  it('uses weekly buckets for a 90-day range', () => {
    expect(trendStepForRange({ from: '2026-05-17', to: '2026-08-14' }, '2026-08-14')).toBe('week')
  })

  it('uses monthly buckets for all time', () => {
    expect(trendStepForRange({}, '2026-08-14')).toBe('month')

    const series = trendSeries(
      [
        tx({ id: 'e1', kind: 'expense', amount: 20, occurredOn: '2026-06-10' }),
        tx({ id: 'e2', kind: 'expense', amount: 30, occurredOn: '2026-08-02' }),
      ],
      {},
      '2026-08-14',
    )

    expect(series.map((item) => item.key)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(series.map((item) => item.expense)).toEqual([20, 0, 30])
  })
})

describe('expensesByDay', () => {
  it('sums expenses and ignores income', () => {
    expect(
      expensesByDay([
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
        tx({ id: 'e2', kind: 'expense', amount: 40, occurredOn: '2026-08-10' }),
        tx({ id: 'i1', kind: 'income', amount: 500, occurredOn: '2026-08-10' }),
        tx({ id: 'e3', kind: 'expense', amount: 20, occurredOn: '2026-08-11' }),
      ]),
    ).toEqual({
      '2026-08-10': 140,
      '2026-08-11': 20,
    })
  })
})

describe('heatmapWindow', () => {
  it('clamps the current month to asOf', () => {
    expect(heatmapWindow({ from: '2026-08-01', to: '2026-08-31' }, '2026-08-14')).toEqual({
      from: '2026-08-01',
      to: '2026-08-14',
      capped: false,
    })
  })

  it('caps a long range to 90 days', () => {
    expect(
      heatmapWindow({}, '2026-08-14', [
        tx({ id: 'e1', kind: 'expense', amount: 10, occurredOn: '2025-01-01' }),
      ]),
    ).toEqual({
      from: '2026-05-17',
      to: '2026-08-14',
      capped: true,
    })
  })
})

describe('heatmapWeeks', () => {
  it('pads to Monday-Sunday and marks days outside the period', () => {
    const { weeks, capped } = heatmapWeeks(
      [
        tx({ id: 'e1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' }),
        tx({ id: 'i1', kind: 'income', amount: 50, occurredOn: '2026-08-10' }),
      ],
      { from: '2026-08-01', to: '2026-08-31' },
      '2026-08-14',
    )

    expect(capped).toBe(false)
    expect(weeks[0]?.days[0]?.date).toBe('2026-07-27')
    expect(weeks[0]?.days[0]?.inPeriod).toBe(false)
    expect(weeks[0]?.monthLabel).toBe('Август')
    expect(weeks[weeks.length - 1]?.days[6]?.date).toBe('2026-08-16')

    const tenth = weeks.flatMap((week) => week.days).find((day) => day.date === '2026-08-10')
    expect(tenth).toMatchObject({ amount: 100, inPeriod: true, isFuture: false })

    const future = weeks.flatMap((week) => week.days).find((day) => day.date === '2026-08-15')
    expect(future).toMatchObject({ inPeriod: false, amount: 0 })
  })
})

describe('formatPeriodLabel', () => {
  it('uses Сегодня for the current day', () => {
    expect(formatPeriodLabel('day', todayLocal())).toBe('Сегодня')
  })

  it('formats another day without a trailing dot', () => {
    expect(formatPeriodLabel('day', '2026-08-14')).toBe('14 авг')
  })

  it('uses Эта неделя for the current week', () => {
    expect(formatPeriodLabel('week', todayLocal())).toBe('Эта неделя')
  })

  it('formats another week as a short range', () => {
    expect(formatPeriodLabel('week', '2026-01-15')).toBe('12–18 янв')
  })

  it('uses the month name', () => {
    expect(formatPeriodLabel('month', '2026-08-14')).toBe('Август')
  })

  it('uses the calendar year', () => {
    expect(formatPeriodLabel('year', '2026-08-14')).toBe('2026')
  })

  it('formats a custom range in the same month', () => {
    expect(formatPeriodLabel('custom', '2026-08-14', { from: '2026-08-12', to: '2026-08-20' })).toBe(
      '12–20 авг',
    )
  })

  it('falls back to Период without custom dates', () => {
    expect(formatPeriodLabel('custom', '2026-08-14', {})).toBe('Период')
  })
})
