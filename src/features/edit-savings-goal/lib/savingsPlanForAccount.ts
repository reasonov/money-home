import {
  parseLocalDate,
  planSavingsGoals,
  todayLocal,
  transferProjectionForAccount,
  type SavingsPlanGoalInput,
  type SavingsPlanResult,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore } from '@/entities/transfer-rule'

export function savingsPlanForAccount(
  accountId: string,
  goals: SavingsPlanGoalInput[],
): SavingsPlanResult {
  const accounts = useAccountStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transferRules = useTransferRuleStore()
  const purchases = usePurchaseStore()
  const transactions = useTransactionStore()

  return planSavingsGoals({
    currentBalance: accounts.getById(accountId)?.amount ?? 0,
    asOfDate: parseLocalDate(todayLocal()),
    accountId,
    goals,
    incomeRules: incomeRules.forAccount(accountId).filter((rule) => rule.active),
    expenseRules: expenseRules.forAccount(accountId).filter((rule) => rule.active),
    plannedPurchases: purchases.plannedFor(accountId),
    postedOccurrenceDates: incomeRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    postedExpenseOccurrenceDates: expenseRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
    ...transferProjectionForAccount(
      transferRules.items,
      accountId,
      (id) => transactions.transferOccurrenceDatesFor(id),
    ),
    transactions: transactions.items.filter(
      (item) => item.accountId === accountId || item.counterpartyAccountId === accountId,
    ),
  })
}
