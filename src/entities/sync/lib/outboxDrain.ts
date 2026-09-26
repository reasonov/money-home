import {
  adjustAccountAmount,
  createAccount,
  setAccountCategories,
  transferBetweenAccounts,
  updateAccount,
} from '@/entities/account'
import {
  deleteCategory,
  deleteCategoryGroup,
  upsertCategory,
  upsertCategoryGroup,
  useCategoryStore,
  type CategoryKind,
} from '@/entities/category'
import { deleteExpenseRule, insertExpenseRule, updateExpenseRule } from '@/entities/expense-rule'
import { deleteIncomeRule, insertIncomeRule, updateIncomeRule } from '@/entities/income-rule'
import { deleteTransferRule, insertTransferRule, updateTransferRule } from '@/entities/transfer-rule'
import { deleteOperationTemplate, upsertOperationTemplate, type OperationTemplateInput } from '@/entities/operation-template'
import {
  cancelPurchase,
  completePurchase,
  insertPurchase,
  updatePurchaseRow,
} from '@/entities/purchase'
import {
  deleteSavingsGoal,
  insertSavingsGoal,
  updateSavingsGoalRow,
} from '@/entities/savings-goal'
import {
  adjustDueExpense,
  adjustDueIncome,
  adjustDueTransfer,
  adjustExpenseOccurrence,
  adjustIncomeOccurrence,
  adjustTransferOccurrence,
  cancelPostedTransaction,
  insertTransaction,
  skipDueExpense,
  skipDueIncome,
  skipDueTransfer,
  skipExpenseOccurrence,
  skipIncomeOccurrence,
  skipTransferOccurrence,
  updatePostedTransaction,
} from '@/entities/transaction'
import type { OutboxRecord } from '@/shared/lib/localDb'
import type { IncomeRule } from '@/entities/income-rule'
import type { ExpenseRule } from '@/entities/expense-rule'
import type { TransferRule } from '@/entities/transfer-rule'

function withoutMissingCategory<T extends { categoryId?: string }>(input: T): T {
  if (!input.categoryId || useCategoryStore().getById(input.categoryId)) {
    return input
  }
  return { ...input, categoryId: undefined }
}

export async function applyOutboxItem(item: OutboxRecord): Promise<void> {
  const payload = item.payload
  switch (item.type) {
    case 'insertTransaction':
      await insertTransaction(
        withoutMissingCategory(payload as Parameters<typeof insertTransaction>[0]),
      )
      return
    case 'insertPurchase':
      await insertPurchase(payload as Parameters<typeof insertPurchase>[0])
      return
    case 'updatePurchase':
      await updatePurchaseRow(
        String(payload.id),
        String(payload.userId),
        payload.input as Parameters<typeof updatePurchaseRow>[2],
      )
      return
    case 'cancelPurchase':
      await cancelPurchase(String(payload.id), String(payload.userId))
      return
    case 'completePurchase':
      await completePurchase(
        String(payload.id),
        payload.transactionId ? String(payload.transactionId) : undefined,
      )
      return
    case 'insertIncomeRule':
      await insertIncomeRule(
        String(payload.userId),
        payload.input as Omit<IncomeRule, 'id'> & { id?: string },
      )
      return
    case 'updateIncomeRule':
      await updateIncomeRule(
        String(payload.id),
        String(payload.userId),
        payload.patch as Partial<Omit<IncomeRule, 'id'>>,
      )
      return
    case 'deleteIncomeRule':
      await deleteIncomeRule(String(payload.id), String(payload.userId))
      return
    case 'insertExpenseRule':
      await insertExpenseRule(
        String(payload.userId),
        payload.input as Omit<ExpenseRule, 'id'> & { id?: string },
      )
      return
    case 'updateExpenseRule':
      await updateExpenseRule(
        String(payload.id),
        String(payload.userId),
        payload.patch as Partial<Omit<ExpenseRule, 'id'>>,
      )
      return
    case 'deleteExpenseRule':
      await deleteExpenseRule(String(payload.id), String(payload.userId))
      return
    case 'insertTransferRule':
      await insertTransferRule(
        String(payload.userId),
        payload.input as Omit<TransferRule, 'id'> & { id?: string },
      )
      return
    case 'updateTransferRule':
      await updateTransferRule(
        String(payload.id),
        String(payload.userId),
        payload.patch as Partial<Omit<TransferRule, 'id'>>,
      )
      return
    case 'deleteTransferRule':
      await deleteTransferRule(String(payload.id), String(payload.userId))
      return
    case 'upsertCategory':
      await upsertCategory(
        payload.input as {
          id?: string
          kind: CategoryKind
          name: string
          color: string
          icon: string
          accountIds: string[]
          groupId?: string | null
          colorManual?: boolean
          sortOrder?: number
        },
      )
      return
    case 'upsertCategoryGroup':
      await upsertCategoryGroup(
        payload.input as {
          id?: string
          kind: CategoryKind
          name: string
          color: string
          icon: string
          accountIds: string[]
          sortOrder?: number
          childColors?: { id: string; color: string }[]
        },
      )
      return
    case 'deleteCategory':
      await deleteCategory(String(payload.id))
      return
    case 'deleteCategoryGroup':
      await deleteCategoryGroup(String(payload.id), Boolean(payload.deleteChildren))
      return
    case 'createAccount':
      await createAccount(payload as Parameters<typeof createAccount>[0])
      return
    case 'updateAccount':
      await updateAccount(String(payload.id), String(payload.userId), {
        ...(payload.name != null ? { name: String(payload.name) } : {}),
        ...(payload.excludeFromTotal != null
          ? { excludeFromTotal: Boolean(payload.excludeFromTotal) }
          : {}),
      })
      return
    case 'adjustAccountBalance':
      await adjustAccountAmount(String(payload.id), Number(payload.delta))
      return
    case 'bindAccountCategories':
      await setAccountCategories(
        String(payload.accountId),
        payload.categoryIds as string[],
        (payload.groupIds as string[] | undefined) ?? [],
      )
      return
    case 'transfer':
      await transferBetweenAccounts(payload as Parameters<typeof transferBetweenAccounts>[0])
      return
    case 'updatePostedTransaction':
      await updatePostedTransaction(payload as Parameters<typeof updatePostedTransaction>[0])
      return
    case 'cancelPostedTransaction':
      await cancelPostedTransaction(String(payload.id))
      return
    case 'skipIncomeOccurrence':
      await skipIncomeOccurrence(String(payload.id))
      return
    case 'skipExpenseOccurrence':
      await skipExpenseOccurrence(String(payload.id))
      return
    case 'skipTransferOccurrence':
      await skipTransferOccurrence(String(payload.id))
      return
    case 'adjustIncomeOccurrence':
      await adjustIncomeOccurrence(String(payload.id), Number(payload.amount))
      return
    case 'adjustExpenseOccurrence':
      await adjustExpenseOccurrence(String(payload.id), Number(payload.amount))
      return
    case 'adjustTransferOccurrence':
      await adjustTransferOccurrence(String(payload.id), Number(payload.amount))
      return
    case 'skipDueIncome':
      await skipDueIncome(String(payload.ruleId), String(payload.occurredOn))
      return
    case 'skipDueExpense':
      await skipDueExpense(String(payload.ruleId), String(payload.occurredOn))
      return
    case 'skipDueTransfer':
      await skipDueTransfer(String(payload.ruleId), String(payload.occurredOn))
      return
    case 'adjustDueIncome':
      await adjustDueIncome(
        String(payload.ruleId),
        String(payload.occurredOn),
        Number(payload.amount),
        payload.title != null ? String(payload.title) : undefined,
        payload.notes != null ? String(payload.notes) : undefined,
      )
      return
    case 'adjustDueExpense':
      await adjustDueExpense(
        String(payload.ruleId),
        String(payload.occurredOn),
        Number(payload.amount),
        payload.title != null ? String(payload.title) : undefined,
        payload.notes != null ? String(payload.notes) : undefined,
      )
      return
    case 'adjustDueTransfer':
      await adjustDueTransfer(
        String(payload.ruleId),
        String(payload.occurredOn),
        Number(payload.amount),
        payload.title != null ? String(payload.title) : undefined,
        payload.notes != null ? String(payload.notes) : undefined,
      )
      return
    case 'upsertOperationTemplate':
      await upsertOperationTemplate(
        String(payload.userId),
        payload.input as OperationTemplateInput,
      )
      return
    case 'deleteOperationTemplate':
      await deleteOperationTemplate(String(payload.id))
      return
    case 'insertSavingsGoal':
      await insertSavingsGoal(payload as Parameters<typeof insertSavingsGoal>[0])
      return
    case 'updateSavingsGoal':
      await updateSavingsGoalRow(
        String(payload.id),
        String(payload.userId),
        payload.input as Parameters<typeof updateSavingsGoalRow>[2],
      )
      return
    case 'deleteSavingsGoal':
      await deleteSavingsGoal(String(payload.id), String(payload.userId))
      return
    default:
      if (String(item.type) === 'insertOperationTemplate') {
        return
      }
      throw new Error(`Unknown outbox type: ${item.type}`)
  }
}
