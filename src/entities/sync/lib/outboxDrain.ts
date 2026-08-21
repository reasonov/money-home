import {
  adjustAccountAmount,
  createAccount,
  setAccountCategories,
  transferBetweenAccounts,
  updateAccount,
} from '@/entities/account'
import { deleteCategory, upsertCategory } from '@/entities/category'
import { deleteExpenseRule, insertExpenseRule, updateExpenseRule } from '@/entities/expense-rule'
import { deleteIncomeRule, insertIncomeRule, updateIncomeRule } from '@/entities/income-rule'
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
  adjustExpenseOccurrence,
  adjustIncomeOccurrence,
  cancelPostedTransaction,
  findExpenseOccurrence,
  findIncomeOccurrence,
  insertTransaction,
  skipExpenseOccurrence,
  skipIncomeOccurrence,
  updatePostedTransaction,
} from '@/entities/transaction'
import type { OutboxRecord } from '@/shared/lib/localDb'
import type { IncomeRule } from '@/entities/income-rule'
import type { ExpenseRule } from '@/entities/expense-rule'
import type { CategoryKind } from '@/entities/category'

export async function applyOutboxItem(item: OutboxRecord): Promise<void> {
  const payload = item.payload
  switch (item.type) {
    case 'insertTransaction':
      await insertTransaction(payload as Parameters<typeof insertTransaction>[0])
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
    case 'upsertCategory':
      await upsertCategory(
        payload.input as {
          id?: string
          kind: CategoryKind
          name: string
          color: string
          icon: string
          accountIds: string[]
        },
      )
      return
    case 'deleteCategory':
      await deleteCategory(String(payload.id))
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
      await setAccountCategories(String(payload.accountId), payload.categoryIds as string[])
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
    case 'adjustIncomeOccurrence':
      await adjustIncomeOccurrence(String(payload.id), Number(payload.amount))
      return
    case 'adjustExpenseOccurrence':
      await adjustExpenseOccurrence(String(payload.id), Number(payload.amount))
      return
    case 'skipDueIncome': {
      const occ = await findIncomeOccurrence(String(payload.ruleId), String(payload.occurredOn))
      if (occ) {
        await skipIncomeOccurrence(occ.id)
      }
      return
    }
    case 'skipDueExpense': {
      const occ = await findExpenseOccurrence(String(payload.ruleId), String(payload.occurredOn))
      if (occ) {
        await skipExpenseOccurrence(occ.id)
      }
      return
    }
    case 'adjustDueIncome': {
      const occ = await findIncomeOccurrence(String(payload.ruleId), String(payload.occurredOn))
      if (occ) {
        await adjustIncomeOccurrence(occ.id, Number(payload.amount))
      }
      return
    }
    case 'adjustDueExpense': {
      const occ = await findExpenseOccurrence(String(payload.ruleId), String(payload.occurredOn))
      if (occ) {
        await adjustExpenseOccurrence(occ.id, Number(payload.amount))
      }
      return
    }
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
