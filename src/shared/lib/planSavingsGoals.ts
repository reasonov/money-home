import { addDays, compareDates, parseLocalDate } from './dates'
import { formatMoneyPlain } from './formatMoney'
import { roundMoney } from './parseAmount'
import {
  projectBalance,
  type ProjectionIncomeRule,
  type ProjectionPurchase,
} from './projectBalance'

export const SAVINGS_AVERAGE_WINDOW_DAYS = 90
export const SAVINGS_DAYS_PER_MONTH = 30.4375

const SLACK_RUB = 1

export interface SavingsPlanGoalInput {
  id?: string
  title?: string
  targetAmount: number
  targetDate: string
  savedAmount: number
  startedOn: string
  status?: 'active' | 'completed' | 'cancelled'
}

export interface SavingsPlanTransaction {
  amount: number
  kind: 'expense' | 'income' | 'transfer'
  source: string
  status: string
  occurredOn: string
  accountId?: string
  counterpartyAccountId?: string
}

export interface SavingsPlanInput {
  currentBalance: number
  asOfDate: Date
  accountId?: string
  goals: SavingsPlanGoalInput[]
  incomeRules: ProjectionIncomeRule[]
  expenseRules?: ProjectionIncomeRule[]
  plannedPurchases: ProjectionPurchase[]
  postedOccurrenceDates?: string[]
  postedExpenseOccurrenceDates?: string[]
  incomingTransferRules?: ProjectionIncomeRule[]
  outgoingTransferRules?: ProjectionIncomeRule[]
  postedIncomingTransferDates?: string[]
  postedOutgoingTransferDates?: string[]
  transactions: SavingsPlanTransaction[]
}

export interface SavingsGoalPlan {
  id?: string
  title?: string
  targetAmount: number
  targetDate: string
  savedAmount: number
  remaining: number
  moneyProgress: number
  timeProgress: number
  onTrack: boolean
  overdue: boolean
  coveredByDate: boolean
  extraPerMonth: number
  message: string
}

export interface SavingsPlanResult {
  avgMonthlyManualIncome: number
  avgMonthlyManualExpense: number
  avgMonthlyManualNet: number
  historyDays: number
  incomeRuleTotal: number
  expenseRuleTotal: number
  plannedSpend: number
  extraPerMonth: number
  onTrack: boolean
  overAllocated: boolean
  labeledTotal: number
  horizonDate: string | null
  goals: SavingsGoalPlan[]
  message: string
}

function calendarDays(from: Date, to: Date): number {
  let n = 0
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (compareDates(cursor, end) < 0) {
    cursor = addDays(cursor, 1)
    n += 1
  }
  return n
}

function monthsUntil(asOf: Date, target: Date): number {
  return Math.max(calendarDays(asOf, target) / SAVINGS_DAYS_PER_MONTH, 1 / 30)
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function inWindow(occurredOn: string, fromExclusive: Date, toInclusive: Date): boolean {
  const date = parseLocalDate(occurredOn)
  return compareDates(date, fromExclusive) > 0 && compareDates(date, toInclusive) <= 0
}

function classifyManual(
  tx: SavingsPlanTransaction,
  accountId?: string,
): 'income' | 'expense' | null {
  if (tx.kind === 'income') return 'income'
  if (tx.kind === 'expense') return 'expense'
  if (tx.kind !== 'transfer') return null
  if (!accountId) return 'expense'
  if (tx.accountId === accountId) return 'expense'
  if (tx.counterpartyAccountId === accountId) return 'income'
  return null
}

function collectAverages(
  transactions: SavingsPlanTransaction[],
  asOfDate: Date,
  accountId?: string,
): { income: number; expense: number; historyDays: number } {
  const fromExclusive = addDays(asOfDate, -SAVINGS_AVERAGE_WINDOW_DAYS)
  let income = 0
  let expense = 0
  let earliest: Date | null = null
  for (const tx of transactions) {
    if (tx.status !== 'posted') {
      continue
    }
    if (!inWindow(tx.occurredOn, fromExclusive, asOfDate)) {
      continue
    }
    const side = classifyManual(tx, accountId)
    if (!side) continue
    const date = parseLocalDate(tx.occurredOn)
    if (!earliest || compareDates(date, earliest) < 0) {
      earliest = date
    }
    if (side === 'income') {
      income += tx.amount
    } else {
      expense += tx.amount
    }
  }
  if (!earliest) {
    return { income: 0, expense: 0, historyDays: 0 }
  }
  const span = calendarDays(earliest, asOfDate) + 1
  const historyDays = Math.min(
    SAVINGS_AVERAGE_WINDOW_DAYS,
    Math.max(span, SAVINGS_DAYS_PER_MONTH),
  )
  return { income, expense, historyDays }
}

function projectionParts(input: SavingsPlanInput, targetDate: Date, includeRules: boolean) {
  const result = projectBalance({
    currentBalance: input.currentBalance,
    asOfDate: input.asOfDate,
    targetDate,
    incomeRules: includeRules ? input.incomeRules : [],
    expenseRules: includeRules ? input.expenseRules : [],
    plannedPurchases: input.plannedPurchases,
    candidateAmount: 0,
    postedOccurrenceDates: includeRules ? input.postedOccurrenceDates : [],
    postedExpenseOccurrenceDates: includeRules ? input.postedExpenseOccurrenceDates : [],
    incomingTransferRules: includeRules ? input.incomingTransferRules : [],
    outgoingTransferRules: includeRules ? input.outgoingTransferRules : [],
    postedIncomingTransferDates: includeRules ? input.postedIncomingTransferDates : [],
    postedOutgoingTransferDates: includeRules ? input.postedOutgoingTransferDates : [],
  })
  const plannedSpend = result.plannedBeforeTarget.reduce((sum, item) => sum + item.amount, 0)
  const expenseRuleTotal = roundMoney(
    input.currentBalance + result.incomeTotal - plannedSpend - result.projectedBalance,
  )
  return {
    projectedKnown: result.projectedBalance,
    incomeRuleTotal: result.incomeTotal,
    expenseRuleTotal,
    plannedSpend,
  }
}

function timeProgress(startedOn: string, targetDate: string, asOf: Date): number {
  const start = parseLocalDate(startedOn)
  const target = parseLocalDate(targetDate)
  const total = calendarDays(start, target)
  if (total <= 0) {
    return compareDates(asOf, target) >= 0 ? 1 : 0
  }
  return clamp01(calendarDays(start, asOf) / total)
}

function goalMessage(goal: SavingsGoalPlan): string {
  if (goal.savedAmount >= goal.targetAmount) {
    return 'Цель достигнута'
  }
  if (goal.overdue) {
    return `Срок вышел, не хватает ${formatMoneyPlain(goal.remaining)} ₽`
  }
  if (goal.onTrack) {
    return 'Укладываемся'
  }
  if (goal.extraPerMonth > 0) {
    return `Не укладываемся, ещё ${formatMoneyPlain(goal.extraPerMonth)} ₽/мес`
  }
  return 'Не укладываемся'
}

export function planSavingsGoals(input: SavingsPlanInput): SavingsPlanResult {
  const averages = collectAverages(input.transactions, input.asOfDate, input.accountId)
  const avgMonthlyManualIncome =
    averages.historyDays > 0
      ? (averages.income / averages.historyDays) * SAVINGS_DAYS_PER_MONTH
      : 0
  const avgMonthlyManualExpense =
    averages.historyDays > 0
      ? (averages.expense / averages.historyDays) * SAVINGS_DAYS_PER_MONTH
      : 0
  const avgMonthlyManualNet = avgMonthlyManualIncome - avgMonthlyManualExpense

  const activeGoals = input.goals.filter(
    (goal) => goal.status !== 'cancelled' && goal.status !== 'completed' && goal.targetAmount > 0,
  )
  const labeledTotal = activeGoals.reduce((sum, goal) => sum + Math.max(0, goal.savedAmount), 0)
  const overAllocated = labeledTotal > input.currentBalance + SLACK_RUB

  const sorted = [...activeGoals].sort((a, b) => {
    const byDate = a.targetDate.localeCompare(b.targetDate)
    if (byDate !== 0) return byDate
    return (a.id ?? '').localeCompare(b.id ?? '')
  })

  const useActuals = averages.historyDays > 0

  const projectedAt = (targetDate: Date): number => {
    const asOf = input.asOfDate
    const overdue = compareDates(targetDate, asOf) < 0
    const projectionDate = overdue ? asOf : targetDate
    const known = projectionParts(input, projectionDate, !useActuals).projectedKnown
    const months = overdue ? 0 : monthsUntil(asOf, projectionDate)
    return known + (useActuals ? avgMonthlyManualNet * months : 0)
  }

  const horizonDate = sorted.length ? sorted[sorted.length - 1]!.targetDate : null
  let incomeRuleTotal = 0
  let expenseRuleTotal = 0
  let plannedSpend = 0
  if (horizonDate) {
    const horizon = parseLocalDate(horizonDate)
    const projectionDate = compareDates(horizon, input.asOfDate) < 0 ? input.asOfDate : horizon
    const parts = projectionParts(input, projectionDate, !useActuals)
    incomeRuleTotal = parts.incomeRuleTotal
    expenseRuleTotal = parts.expenseRuleTotal
    plannedSpend = parts.plannedSpend
  }

  let neededCumulative = 0
  let maxExtraPerMonth = 0
  const goals: SavingsGoalPlan[] = sorted.map((goal) => {
    const remaining = Math.max(0, roundMoney(goal.targetAmount - goal.savedAmount))
    neededCumulative += remaining
    const target = parseLocalDate(goal.targetDate)
    const overdue = compareDates(input.asOfDate, target) > 0 && remaining > 0
    const projectionDate = overdue ? input.asOfDate : target
    const projected = projectedAt(target)
    const free = projected - labeledTotal
    const earlierNeed = neededCumulative - remaining
    const leftoverForThis = Math.max(0, free) - earlierNeed
    const coveredByDate = remaining <= leftoverForThis + SLACK_RUB
    const uncovered = Math.max(0, remaining - Math.max(0, leftoverForThis))
    const months = overdue ? 1 / 30 : monthsUntil(input.asOfDate, projectionDate)
    const extraPerMonth = Math.max(0, roundMoney(uncovered / months))
    const gap = neededCumulative - Math.max(0, free)
    const constraintExtra = Math.max(0, gap) / months
    if (constraintExtra > maxExtraPerMonth) {
      maxExtraPerMonth = constraintExtra
    }

    const reached = remaining === 0
    const moneyProgress = clamp01(goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0)
    const progressTime = timeProgress(goal.startedOn, goal.targetDate, input.asOfDate)
    const linearOk = goal.savedAmount + SLACK_RUB >= goal.targetAmount * progressTime
    const onTrack = reached || (!overdue && coveredByDate && linearOk)

    const plan: SavingsGoalPlan = {
      ...(goal.id ? { id: goal.id } : {}),
      ...(goal.title ? { title: goal.title } : {}),
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      savedAmount: goal.savedAmount,
      remaining,
      moneyProgress,
      timeProgress: progressTime,
      onTrack,
      overdue,
      coveredByDate: reached || coveredByDate,
      extraPerMonth,
      message: '',
    }
    plan.message = goalMessage(plan)
    return plan
  })

  const extraPerMonth = Math.max(0, roundMoney(maxExtraPerMonth))
  const onTrack = extraPerMonth === 0 && goals.every((goal) => goal.onTrack)

  return {
    avgMonthlyManualIncome: roundMoney(avgMonthlyManualIncome),
    avgMonthlyManualExpense: roundMoney(avgMonthlyManualExpense),
    avgMonthlyManualNet: roundMoney(avgMonthlyManualNet),
    historyDays: averages.historyDays,
    incomeRuleTotal,
    expenseRuleTotal,
    plannedSpend,
    extraPerMonth,
    onTrack,
    overAllocated,
    labeledTotal,
    horizonDate,
    goals,
    message:
      extraPerMonth <= 0
        ? 'При средних показателях укладываемся в срок'
        : `При средних показателях нужно дополнительно вносить на счёт ${formatMoneyPlain(extraPerMonth)} ₽ в месяц`,
  }
}
