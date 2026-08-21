import { describe, expect, it } from 'vitest'
import { parseLocalDate, planSavingsGoals, type SavingsPlanInput } from '@/shared'
import { buildAdviceLevers, fallbackTipsFromLevers } from '../buildAdviceLevers'
import type { SavingsAdviceCategory } from '../summarizeSpending'

const asOfDate = parseLocalDate('2026-08-20')

const alcohol: SavingsAdviceCategory = {
  name: 'Алкоголь',
  categoryId: 'cat-alc',
  current: 7000,
  previous: 1800,
  delta: 5200,
  currentCount: 8,
  previousCount: 3,
}

const food: SavingsAdviceCategory = {
  name: 'Еда',
  current: 12000,
  previous: 11800,
  delta: 200,
  currentCount: 20,
  previousCount: 19,
}

function planInput(overrides: Partial<SavingsPlanInput> = {}): SavingsPlanInput {
  return {
    currentBalance: 10000,
    asOfDate,
    accountId: 'a1',
    goals: [
      {
        id: 'g1',
        title: 'Отпуск',
        targetAmount: 50000,
        targetDate: '2026-12-01',
        savedAmount: 0,
        startedOn: '2026-01-01',
      },
    ],
    incomeRules: [],
    plannedPurchases: [],
    transactions: [],
    ...overrides,
  }
}

describe('buildAdviceLevers', () => {
  it('turns a category spike into a revert lever', () => {
    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth: 8000,
      remaining: 40000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [alcohol, food],
      increases: [alcohol],
      expenseRules: [],
      planInput: planInput(),
    })

    const revert = levers.find((item) => item.kind === 'revert_category')
    expect(revert?.categoryName).toBe('Алкоголь')
    expect(revert?.categoryId).toBe('cat-alc')
    expect(revert?.impact).toBeGreaterThan(5000)
    expect(revert?.coversGap).toBe(false)
    expect(levers.some((item) => item.id === 'cut:Алкоголь')).toBe(false)
    expect(levers.some((item) => item.kind === 'set_aside')).toBe(true)
    expect(levers.find((item) => item.kind === 'set_aside')?.fact).toContain('01.12.2026')
  })

  it('offers a cut when spend is large but did not spike', () => {
    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth: 8000,
      remaining: 40000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [food],
      increases: [],
      expenseRules: [],
      planInput: planInput(),
    })

    const cut = levers.find((item) => item.kind === 'cut_category')
    expect(cut?.categoryName).toBe('Еда')
    expect(cut?.impact).toBe(8000)
    expect(cut?.coversGap).toBe(true)
  })

  it('measures deferring a planned purchase against extraPerMonth', () => {
    const withPurchase = planInput({
      plannedPurchases: [
        {
          id: 'p1',
          title: 'Штора',
          amount: 15000,
          plannedDate: '2026-09-01',
          status: 'planned',
        },
      ],
    })
    const extraPerMonth = planSavingsGoals(withPurchase).goals[0]?.extraPerMonth ?? 0
    expect(extraPerMonth).toBeGreaterThan(0)

    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth,
      remaining: 50000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [],
      increases: [],
      expenseRules: [],
      planInput: withPurchase,
    })

    const defer = levers.find((item) => item.kind === 'defer_purchase')
    expect(defer?.purchaseId).toBe('p1')
    expect(defer?.impact).toBeGreaterThan(0)
    expect(defer?.extraAfter).toBeLessThan(extraPerMonth)
    expect(defer?.fact).toContain('01.09.2026')
    expect(defer?.fact).not.toContain('2026-09-01')
  })

  it('adds delay levers that lower the monthly extra', () => {
    const extraPerMonth = 12000
    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth,
      remaining: 40000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [],
      increases: [],
      expenseRules: [],
      planInput: planInput(),
    })

    const delays = levers.filter((item) => item.kind === 'delay_date')
    expect(delays.map((item) => item.newTargetDate)).toEqual(
      expect.arrayContaining(['2026-12-15', '2026-12-29']),
    )
    expect(delays.every((item) => (item.extraAfter ?? extraPerMonth) < extraPerMonth)).toBe(true)
    expect(delays[0]?.fact).toContain('01.12.2026')
    expect(delays[0]?.fact).toContain('15.12.2026')
    expect(delays[0]?.fact).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('includes a recurring expense rule when it can close the gap', () => {
    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth: 8000,
      remaining: 40000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [],
      increases: [],
      expenseRules: [{ id: 'r1', amount: 25000, frequency: 'monthly', title: 'Аренда' }],
      planInput: planInput(),
    })

    const rule = levers.find((item) => item.kind === 'review_rule')
    expect(rule?.ruleId).toBe('r1')
    expect(rule?.impact).toBe(8000)
    expect(rule?.coversGap).toBe(true)
  })

  it('builds fallback tips from lever facts', () => {
    const levers = buildAdviceLevers({
      asOfDate,
      goalId: 'g1',
      extraPerMonth: 8000,
      remaining: 40000,
      targetDate: '2026-12-01',
      overdue: false,
      categories: [alcohol],
      increases: [alcohol],
      expenseRules: [],
      planInput: planInput(),
    })
    const tips = fallbackTipsFromLevers(levers, 2)
    expect(tips).toHaveLength(2)
    expect(tips[0]?.detail).toBe(levers[0]?.fact)
    expect(tips[0]?.title).toBeTruthy()
  })
})
