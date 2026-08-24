import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import { useOperationTemplateStore } from '@/entities/operation-template'
import { usePurchaseStore } from '@/entities/purchase'
import { useSavingsGoalStore } from '@/entities/savings-goal'
import { useTransactionStore } from '@/entities/transaction'
import { loadReplica, saveReplica } from '@/shared/lib/localDb'
import { getLocalOnlyIds, getSkippedDueKeys, setSkippedDueKeys } from '@/shared/lib/offlineMeta'
import { roundMoney } from '@/shared/lib/parseAmount'
import type { ReplicaPayload } from '../model/types'

export function snapshotStores(): ReplicaPayload {
  const localOnly = getLocalOnlyIds()
  const transactions = useTransactionStore()
  return {
    accounts: [...useAccountStore().items],
    members: [...useAccountStore().members],
    categories: [...useCategoryStore().items],
    categoryGroups: [...useCategoryStore().groups],
    purchases: [...usePurchaseStore().items],
    savingsGoals: [...useSavingsGoalStore().items],
    incomeRules: [...useIncomeRuleStore().items],
    expenseRules: [...useExpenseRuleStore().items],
    transferRules: [...useTransferRuleStore().items],
    transactions: transactions.items.filter((item) => !localOnly.has(item.id)),
    occurrences: transactions.occurrences.filter((item) => !localOnly.has(item.id)),
    expenseOccurrences: transactions.expenseOccurrences.filter((item) => !localOnly.has(item.id)),
    transferOccurrences: transactions.transferOccurrences.filter((item) => !localOnly.has(item.id)),
    operationTemplates: [...useOperationTemplateStore().items],
    selectedAccountId: useAccountStore().selectedAccountId,
    skippedDueKeys: [...getSkippedDueKeys()],
  }
}

function normalizeAccountAmount(amount: unknown) {
  const value = Number(amount)
  return Number.isFinite(value) ? roundMoney(value) : 0
}

export function hydrateStores(payload: ReplicaPayload): void {
  useAccountStore().hydrate(
    payload.accounts.map((account) => ({
      ...account,
      amount: normalizeAccountAmount(account.amount),
      excludeFromTotal: Boolean(account.excludeFromTotal),
    })),
    payload.members.map((item) => ({
      ...item,
      joinedAt: item.joinedAt ?? '',
    })),
    payload.selectedAccountId,
  )
  useCategoryStore().hydrate(payload.categories, payload.categoryGroups ?? [])
  usePurchaseStore().hydrate(payload.purchases)
  useSavingsGoalStore().hydrate(payload.savingsGoals ?? [])
  useIncomeRuleStore().hydrate(payload.incomeRules)
  useExpenseRuleStore().hydrate(payload.expenseRules)
  useTransferRuleStore().hydrate(payload.transferRules ?? [])
  useOperationTemplateStore().hydrate(payload.operationTemplates ?? [])
  useTransactionStore().hydrate(
    payload.transactions,
    payload.occurrences,
    payload.expenseOccurrences,
    payload.transferOccurrences ?? [],
  )
}

export async function persistReplica(userId: string): Promise<void> {
  await saveReplica(userId, snapshotStores())
}

export async function tryHydrateReplica(userId: string): Promise<boolean> {
  const record = await loadReplica(userId)
  if (!record?.payload || typeof record.payload !== 'object') {
    return false
  }
  const payload = record.payload as ReplicaPayload
  if (!Array.isArray(payload.accounts)) {
    return false
  }
  hydrateStores({
    accounts: payload.accounts ?? [],
    members: payload.members ?? [],
    categories: payload.categories ?? [],
    categoryGroups: payload.categoryGroups ?? [],
    purchases: payload.purchases ?? [],
    savingsGoals: payload.savingsGoals ?? [],
    incomeRules: payload.incomeRules ?? [],
    expenseRules: payload.expenseRules ?? [],
    transferRules: payload.transferRules ?? [],
    transactions: payload.transactions ?? [],
    occurrences: payload.occurrences ?? [],
    expenseOccurrences: payload.expenseOccurrences ?? [],
    transferOccurrences: payload.transferOccurrences ?? [],
    operationTemplates: payload.operationTemplates ?? [],
    selectedAccountId: payload.selectedAccountId ?? ALL_ACCOUNTS_ID,
    skippedDueKeys: payload.skippedDueKeys ?? [],
  })
  setSkippedDueKeys(payload.skippedDueKeys ?? [])
  return true
}
