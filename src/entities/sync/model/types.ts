import type { Account, AccountMember } from '@/entities/account'
import type { Category, CategoryGroup } from '@/entities/category'
import type { ExpenseRule } from '@/entities/expense-rule'
import type { IncomeRule } from '@/entities/income-rule'
import type { TransferRule } from '@/entities/transfer-rule'
import type { OperationTemplate } from '@/entities/operation-template'
import type { Purchase } from '@/entities/purchase'
import type { SavingsGoal } from '@/entities/savings-goal'
import type { Transaction } from '@/entities/transaction'
import type { OccurrenceRow, ExpenseOccurrenceRow, TransferOccurrenceRow } from '@/entities/transaction'

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'error' | 'readonly'

export interface ReplicaPayload {
  accounts: Account[]
  members: AccountMember[]
  categories: Category[]
  categoryGroups: CategoryGroup[]
  purchases: Purchase[]
  savingsGoals: SavingsGoal[]
  incomeRules: IncomeRule[]
  expenseRules: ExpenseRule[]
  transferRules: TransferRule[]
  transactions: Transaction[]
  occurrences: OccurrenceRow[]
  expenseOccurrences: ExpenseOccurrenceRow[]
  transferOccurrences: TransferOccurrenceRow[]
  operationTemplates: OperationTemplate[]
  selectedAccountId: string
  skippedDueKeys: string[]
}

export type OutboxType =
  | 'insertTransaction'
  | 'insertPurchase'
  | 'updatePurchase'
  | 'cancelPurchase'
  | 'completePurchase'
  | 'insertIncomeRule'
  | 'updateIncomeRule'
  | 'deleteIncomeRule'
  | 'insertExpenseRule'
  | 'updateExpenseRule'
  | 'deleteExpenseRule'
  | 'insertTransferRule'
  | 'updateTransferRule'
  | 'deleteTransferRule'
  | 'upsertCategory'
  | 'upsertCategoryGroup'
  | 'deleteCategory'
  | 'deleteCategoryGroup'
  | 'createAccount'
  | 'updateAccount'
  | 'adjustAccountBalance'
  | 'bindAccountCategories'
  | 'transfer'
  | 'updatePostedTransaction'
  | 'cancelPostedTransaction'
  | 'skipIncomeOccurrence'
  | 'skipExpenseOccurrence'
  | 'adjustIncomeOccurrence'
  | 'adjustExpenseOccurrence'
  | 'skipTransferOccurrence'
  | 'adjustTransferOccurrence'
  | 'skipDueIncome'
  | 'skipDueExpense'
  | 'skipDueTransfer'
  | 'adjustDueIncome'
  | 'adjustDueExpense'
  | 'adjustDueTransfer'
  | 'upsertOperationTemplate'
  | 'deleteOperationTemplate'
  | 'insertSavingsGoal'
  | 'updateSavingsGoal'
  | 'deleteSavingsGoal'
