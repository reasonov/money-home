import type { Account, AccountMember } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { ExpenseRule } from '@/entities/expense-rule'
import type { IncomeRule } from '@/entities/income-rule'
import type { Purchase } from '@/entities/purchase'
import type { Transaction } from '@/entities/transaction'
import type { ExpenseOccurrenceRow, OccurrenceRow } from '@/entities/transaction'

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'error' | 'readonly'

export interface ReplicaPayload {
  accounts: Account[]
  members: AccountMember[]
  categories: Category[]
  purchases: Purchase[]
  incomeRules: IncomeRule[]
  expenseRules: ExpenseRule[]
  transactions: Transaction[]
  occurrences: OccurrenceRow[]
  expenseOccurrences: ExpenseOccurrenceRow[]
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
  | 'upsertCategory'
  | 'deleteCategory'
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
  | 'skipDueIncome'
  | 'skipDueExpense'
  | 'adjustDueIncome'
  | 'adjustDueExpense'
