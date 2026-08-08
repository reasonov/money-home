import { describe, expect, it } from 'vitest'
import { formatLocalDate, parseLocalDate } from '../dates'
import { availableUntilNextIncome, projectBalance } from '../projectBalance'

describe('projectBalance', () => {
  it('rejects curtain when projected balance is 1500', () => {
    const result = projectBalance({
      currentBalance: 1500,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-25'),
      incomeRules: [],
      plannedPurchases: [],
      candidateAmount: 2300,
    })

    expect(result.projectedBalance).toBe(1500)
    expect(result.canAfford).toBe(false)
    expect(result.shortfall).toBe(800)
    expect(result.message).toMatch(/1\s500/)
    expect(result.message).toContain('не хватает')
    expect(result.nextAffordableDate).toBeNull()
  })

  it('returns breakdown with planned purchases and incomes on reject', () => {
    const result = projectBalance({
      currentBalance: 1000,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-25'),
      incomeRules: [
        {
          amount: 2500,
          frequency: 'monthly',
          monthDay: 10,
          active: true,
        },
      ],
      plannedPurchases: [
        {
          id: 'p1',
          title: 'Стул',
          amount: 2500,
          plannedDate: '2026-08-15',
          status: 'planned',
        },
        {
          id: 'p2',
          title: 'Диван',
          amount: 3000,
          plannedDate: '2026-08-20',
          status: 'planned',
        },
      ],
      candidateAmount: 2300,
    })

    expect(result.canAfford).toBe(false)
    expect(result.projectedBalance).toBe(-2000)
    expect(result.shortfall).toBe(4300)
    expect(result.incomeTotal).toBe(2500)
    expect(result.incomeOccurrencesCount).toBe(1)
    expect(result.plannedBeforeTarget).toEqual([
      { title: 'Стул', amount: 2500, plannedDate: '2026-08-15' },
      { title: 'Диван', amount: 3000, plannedDate: '2026-08-20' },
    ])
  })

  it('finds nextAffordableDate after upcoming income', () => {
    const result = projectBalance({
      currentBalance: 500,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-10'),
      incomeRules: [
        {
          amount: 3000,
          frequency: 'monthly',
          monthDay: 20,
          active: true,
        },
      ],
      plannedPurchases: [],
      candidateAmount: 2500,
    })

    expect(result.canAfford).toBe(false)
    expect(result.projectedBalance).toBe(500)
    expect(result.nextAffordableDate).not.toBeNull()
    expect(formatLocalDate(result.nextAffordableDate!)).toBe('2026-08-20')
  })

  it('returns null nextAffordableDate within horizon without incomes', () => {
    const result = projectBalance({
      currentBalance: 100,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-25'),
      incomeRules: [],
      plannedPurchases: [],
      candidateAmount: 5000,
    })

    expect(result.canAfford).toBe(false)
    expect(result.nextAffordableDate).toBeNull()
  })

  it('allows purchase when projected balance covers amount', () => {
    const result = projectBalance({
      currentBalance: 1000,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-25'),
      incomeRules: [
        {
          amount: 2000,
          frequency: 'monthly',
          monthDay: 10,
          active: true,
        },
      ],
      plannedPurchases: [
        {
          id: 'p1',
          amount: 500,
          plannedDate: '2026-08-15',
          status: 'planned',
        },
      ],
      candidateAmount: 2300,
    })

    expect(result.projectedBalance).toBe(2500)
    expect(result.canAfford).toBe(true)
    expect(result.shortfall).toBe(0)
    expect(result.message).toBeNull()
    expect(result.nextAffordableDate).toBeNull()
  })

  it('excludes purchase on asOfDate from planned spend', () => {
    const result = projectBalance({
      currentBalance: 3000,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-10'),
      incomeRules: [],
      plannedPurchases: [
        {
          amount: 1000,
          plannedDate: '2026-08-04',
          status: 'planned',
        },
      ],
      candidateAmount: 2500,
    })

    expect(result.projectedBalance).toBe(3000)
    expect(result.canAfford).toBe(true)
    expect(result.plannedBeforeTarget).toEqual([])
  })

  it('excludes self when editing purchase', () => {
    const result = projectBalance({
      currentBalance: 2000,
      asOfDate: parseLocalDate('2026-08-04'),
      targetDate: parseLocalDate('2026-08-20'),
      incomeRules: [],
      plannedPurchases: [
        {
          id: 'self',
          amount: 1500,
          plannedDate: '2026-08-20',
          status: 'planned',
        },
      ],
      candidateAmount: 1500,
      excludePurchaseId: 'self',
    })

    expect(result.projectedBalance).toBe(2000)
    expect(result.canAfford).toBe(true)
    expect(result.plannedBeforeTarget).toEqual([])
  })
})

describe('availableUntilNextIncome', () => {
  it('subtracts planned spend before next income', () => {
    const result = availableUntilNextIncome({
      currentBalance: 10000,
      asOfDate: parseLocalDate('2026-08-04'),
      incomeRules: [
        {
          amount: 20000,
          frequency: 'monthly',
          monthDay: 4,
          active: true,
        },
      ],
      plannedPurchases: [
        {
          title: 'Стул',
          amount: 5000,
          plannedDate: '2026-08-10',
          status: 'planned',
        },
        {
          title: 'После пополнения',
          amount: 3000,
          plannedDate: '2026-09-10',
          status: 'planned',
        },
      ],
    })

    expect(formatLocalDate(result.nextIncomeDate!)).toBe('2026-09-04')
    expect(result.plannedSpend).toBe(5000)
    expect(result.available).toBe(5000)
  })

  it('excludes purchases on next income day', () => {
    const result = availableUntilNextIncome({
      currentBalance: 10000,
      asOfDate: parseLocalDate('2026-08-04'),
      incomeRules: [
        {
          amount: 5000,
          frequency: 'monthly',
          monthDay: 20,
          active: true,
        },
      ],
      plannedPurchases: [
        {
          amount: 2000,
          plannedDate: '2026-08-20',
          status: 'planned',
        },
      ],
    })

    expect(formatLocalDate(result.nextIncomeDate!)).toBe('2026-08-20')
    expect(result.plannedSpend).toBe(0)
    expect(result.available).toBe(10000)
  })

  it('without income rules subtracts planned within horizon', () => {
    const result = availableUntilNextIncome({
      currentBalance: 8000,
      asOfDate: parseLocalDate('2026-08-04'),
      incomeRules: [],
      plannedPurchases: [
        {
          amount: 3000,
          plannedDate: '2026-08-15',
          status: 'planned',
        },
      ],
    })

    expect(result.nextIncomeDate).toBeNull()
    expect(result.plannedSpend).toBe(3000)
    expect(result.available).toBe(5000)
  })

  it('includes today and overdue planned before next income', () => {
    const result = availableUntilNextIncome({
      currentBalance: 10000,
      asOfDate: parseLocalDate('2026-08-04'),
      incomeRules: [
        {
          amount: 20000,
          frequency: 'monthly',
          monthDay: 20,
          active: true,
        },
      ],
      plannedPurchases: [
        {
          amount: 1500,
          plannedDate: '2026-08-01',
          status: 'planned',
        },
        {
          amount: 2500,
          plannedDate: '2026-08-04',
          status: 'planned',
        },
        {
          amount: 1000,
          plannedDate: '2026-08-10',
          status: 'planned',
        },
        {
          amount: 4000,
          plannedDate: '2026-08-25',
          status: 'planned',
        },
      ],
    })

    expect(formatLocalDate(result.nextIncomeDate!)).toBe('2026-08-20')
    expect(result.plannedSpend).toBe(5000)
    expect(result.available).toBe(5000)
  })
})
