import {
  parseLocalDate,
  planSavingsGoals,
  todayLocal,
  transferProjectionForAccount,
  type SavingsPlanInput,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSavingsGoalStore } from '@/entities/savings-goal'
import { useCategoryStore } from '@/entities/category'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import { adviceMonthsLeft, buildAdviceLevers } from './buildAdviceLevers'
import { summarizeSpendingForAdvice, type SavingsAdviceSummary } from './summarizeSpending'

export type { SavingsAdviceSummary }

export function buildAdviceSummary(accountId: string, goalId: string): SavingsAdviceSummary | null {
  const goals = useSavingsGoalStore()
  const goal = goals.getById(goalId)
  if (!goal || goal.accountId !== accountId || goal.status !== 'active') {
    return null
  }

  const accounts = useAccountStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transferRules = useTransferRuleStore()
  const purchases = usePurchaseStore()
  const transactions = useTransactionStore()
  const categoryStore = useCategoryStore()
  const asOfDate = parseLocalDate(todayLocal())
  const expenseRuleRows = expenseRules.forAccount(accountId).filter((rule) => rule.active)
  const planInput: SavingsPlanInput = {
    currentBalance: accounts.getById(accountId)?.amount ?? 0,
    asOfDate,
    accountId,
    goals: goals.activeFor(accountId).map((item) => ({
      id: item.id,
      title: item.title,
      targetAmount: item.targetAmount,
      targetDate: item.targetDate,
      savedAmount: item.savedAmount,
      startedOn: item.startedOn,
      status: item.status,
    })),
    incomeRules: incomeRules.forAccount(accountId).filter((rule) => rule.active),
    expenseRules: expenseRuleRows,
    plannedPurchases: purchases.plannedFor(accountId),
    postedOccurrenceDates: incomeRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    postedExpenseOccurrenceDates: expenseRuleRows.flatMap((rule) =>
      transactions.expenseOccurrenceDatesFor(rule.id),
    ),
    ...transferProjectionForAccount(
      transferRules.items,
      accountId,
      (id) => transactions.transferOccurrenceDatesFor(id),
    ),
    transactions: transactions.items
      .filter((item) => item.accountId === accountId || item.counterpartyAccountId === accountId)
      .map((item) => {
        const cat = item.categoryId ? categoryStore.getById(item.categoryId) : undefined
        const group = cat?.groupId ? categoryStore.getGroupById(cat.groupId) : undefined
        return {
          ...item,
          ...(group ? { groupId: group.id, groupName: group.name } : {}),
        }
      }),
  }

  const plan = planSavingsGoals(planInput)
  const planned = plan.goals.find((item) => item.id === goalId)
  if (!planned) {
    return null
  }

  const spending = summarizeSpendingForAdvice({
    accountId,
    asOfDate,
    transactions: transactions.items,
    goal: {
      title: planned.title || goal.title,
      remaining: planned.remaining,
      extraPerMonth: planned.extraPerMonth,
      targetDate: planned.targetDate,
      savedAmount: planned.savedAmount,
      targetAmount: planned.targetAmount,
      overdue: planned.overdue,
      message: planned.message,
    },
    avgMonthlyManualExpense: plan.avgMonthlyManualExpense,
    plannedSpend: plan.plannedSpend,
  })

  return {
    ...spending,
    goal: {
      ...spending.goal,
      monthsLeft: adviceMonthsLeft(asOfDate, planned.targetDate, planned.overdue),
    },
    avgMonthlyManualIncome: plan.avgMonthlyManualIncome,
    avgMonthlyManualNet: plan.avgMonthlyManualNet,
    historyDays: plan.historyDays,
    overAllocated: plan.overAllocated,
    otherGoals: plan.goals
      .filter((item) => item.id && item.id !== goalId)
      .map((item) => ({
        title: item.title || 'Копилка',
        remaining: item.remaining,
        targetDate: item.targetDate,
      })),
    levers: buildAdviceLevers({
      asOfDate,
      goalId,
      extraPerMonth: planned.extraPerMonth,
      remaining: planned.remaining,
      targetDate: planned.targetDate,
      overdue: planned.overdue,
      categories: spending.categories,
      increases: spending.increases,
      expenseRules: expenseRuleRows,
      planInput,
    }),
  }
}
