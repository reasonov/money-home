import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'
import { loadReplica, saveReplica } from '@/shared/lib/localDb'
import { getLocalOnlyIds, getSkippedDueKeys, setSkippedDueKeys } from '@/shared/lib/offlineMeta'
import type { ReplicaPayload } from '../model/types'

export function snapshotStores(): ReplicaPayload {
  const localOnly = getLocalOnlyIds()
  const transactions = useTransactionStore()
  return {
    accounts: [...useAccountStore().items],
    members: [...useAccountStore().members],
    categories: [...useCategoryStore().items],
    purchases: [...usePurchaseStore().items],
    incomeRules: [...useIncomeRuleStore().items],
    expenseRules: [...useExpenseRuleStore().items],
    transactions: transactions.items.filter((item) => !localOnly.has(item.id)),
    occurrences: transactions.occurrences.filter((item) => !localOnly.has(item.id)),
    expenseOccurrences: transactions.expenseOccurrences.filter((item) => !localOnly.has(item.id)),
    selectedAccountId: useAccountStore().selectedAccountId,
    skippedDueKeys: [...getSkippedDueKeys()],
  }
}

export function hydrateStores(payload: ReplicaPayload): void {
  useAccountStore().hydrate(payload.accounts, payload.members, payload.selectedAccountId)
  useCategoryStore().hydrate(payload.categories)
  usePurchaseStore().hydrate(payload.purchases)
  useIncomeRuleStore().hydrate(payload.incomeRules)
  useExpenseRuleStore().hydrate(payload.expenseRules)
  useTransactionStore().hydrate(
    payload.transactions,
    payload.occurrences,
    payload.expenseOccurrences,
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
    purchases: payload.purchases ?? [],
    incomeRules: payload.incomeRules ?? [],
    expenseRules: payload.expenseRules ?? [],
    transactions: payload.transactions ?? [],
    occurrences: payload.occurrences ?? [],
    expenseOccurrences: payload.expenseOccurrences ?? [],
    selectedAccountId: payload.selectedAccountId ?? ALL_ACCOUNTS_ID,
    skippedDueKeys: payload.skippedDueKeys ?? [],
  })
  setSkippedDueKeys(payload.skippedDueKeys ?? [])
  return true
}
