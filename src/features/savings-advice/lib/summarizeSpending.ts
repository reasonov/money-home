import { addDays, compareDates, parseLocalDate, roundMoney } from '@/shared'
import type { AdviceLever } from './buildAdviceLevers'

export const ADVICE_WINDOW_DAYS = 30
export const ADVICE_TOP_CATEGORIES = 8
export const ADVICE_TOP_INCREASES = 5

export interface SavingsAdviceTransaction {
  amount: number
  kind: 'expense' | 'income' | 'transfer'
  status: string
  occurredOn: string
  accountId: string
  categoryId?: string
  categoryName?: string
}

export interface SavingsAdviceGoalFact {
  title: string
  remaining: number
  extraPerMonth: number
  targetDate: string
  savedAmount: number
  targetAmount: number
  overdue: boolean
  message: string
  monthsLeft: number
}

export interface SavingsAdviceCategory {
  name: string
  categoryId?: string
  current: number
  previous: number
  delta: number
  currentCount: number
  previousCount: number
}

export interface SavingsAdviceOtherGoal {
  title: string
  remaining: number
  targetDate: string
}

export interface SavingsAdviceSpending {
  accountId: string
  goal: SavingsAdviceGoalFact
  avgMonthlyManualExpense: number
  plannedSpend: number
  currentTotal: number
  previousTotal: number
  categories: SavingsAdviceCategory[]
  increases: SavingsAdviceCategory[]
}

export interface SavingsAdviceSummary extends SavingsAdviceSpending {
  avgMonthlyManualIncome: number
  avgMonthlyManualNet: number
  historyDays: number
  overAllocated: boolean
  otherGoals: SavingsAdviceOtherGoal[]
  levers: AdviceLever[]
}

export interface SummarizeSpendingInput {
  accountId: string
  asOfDate: Date
  transactions: SavingsAdviceTransaction[]
  goal: Omit<SavingsAdviceGoalFact, 'monthsLeft'>
  avgMonthlyManualExpense: number
  plannedSpend: number
}

function inWindow(occurredOn: string, fromExclusive: Date, toInclusive: Date): boolean {
  const date = parseLocalDate(occurredOn)
  return compareDates(date, fromExclusive) > 0 && compareDates(date, toInclusive) <= 0
}

function categoryName(item: SavingsAdviceTransaction): string {
  const name = item.categoryName?.trim()
  return name || 'Без категории'
}

type TotalsRow = {
  categoryId?: string | null
  current: number
  previous: number
  currentCount: number
  previousCount: number
}

function toRows(totals: Map<string, TotalsRow>): SavingsAdviceCategory[] {
  return [...totals.entries()]
    .map(([name, amounts]) => ({
      name,
      ...(amounts.categoryId ? { categoryId: amounts.categoryId } : {}),
      current: roundMoney(amounts.current),
      previous: roundMoney(amounts.previous),
      delta: roundMoney(amounts.current - amounts.previous),
      currentCount: amounts.currentCount,
      previousCount: amounts.previousCount,
    }))
    .filter((row) => row.current > 0 || row.previous > 0)
}

export function summarizeSpendingForAdvice(input: SummarizeSpendingInput): SavingsAdviceSpending {
  const currentFromExclusive = addDays(input.asOfDate, -ADVICE_WINDOW_DAYS)
  const previousFromExclusive = addDays(input.asOfDate, -ADVICE_WINDOW_DAYS * 2)
  const totals = new Map<string, TotalsRow>()
  let currentTotal = 0
  let previousTotal = 0

  for (const item of input.transactions) {
    if (item.status !== 'posted' || item.kind !== 'expense' || item.accountId !== input.accountId) {
      continue
    }
    const inCurrent = inWindow(item.occurredOn, currentFromExclusive, input.asOfDate)
    const inPrevious = inWindow(item.occurredOn, previousFromExclusive, currentFromExclusive)
    if (!inCurrent && !inPrevious) {
      continue
    }
    const name = categoryName(item)
    const row = totals.get(name) ?? {
      current: 0,
      previous: 0,
      currentCount: 0,
      previousCount: 0,
    }
    if (item.categoryId) {
      if (row.categoryId === undefined) {
        row.categoryId = item.categoryId
      } else if (row.categoryId !== item.categoryId) {
        row.categoryId = null
      }
    }
    if (inCurrent) {
      row.current += item.amount
      row.currentCount += 1
      currentTotal += item.amount
    } else {
      row.previous += item.amount
      row.previousCount += 1
      previousTotal += item.amount
    }
    totals.set(name, row)
  }

  const rows = toRows(totals)
  const categories = [...rows]
    .sort((a, b) => b.current - a.current || a.name.localeCompare(b.name, 'ru'))
    .slice(0, ADVICE_TOP_CATEGORIES)
  const increases = [...rows]
    .filter((row) => row.delta > 0)
    .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name, 'ru'))
    .slice(0, ADVICE_TOP_INCREASES)

  return {
    accountId: input.accountId,
    goal: {
      ...input.goal,
      remaining: roundMoney(input.goal.remaining),
      extraPerMonth: roundMoney(input.goal.extraPerMonth),
      savedAmount: roundMoney(input.goal.savedAmount),
      targetAmount: roundMoney(input.goal.targetAmount),
      monthsLeft: 0,
    },
    avgMonthlyManualExpense: roundMoney(input.avgMonthlyManualExpense),
    plannedSpend: roundMoney(input.plannedSpend),
    currentTotal: roundMoney(currentTotal),
    previousTotal: roundMoney(previousTotal),
    categories,
    increases,
  }
}
