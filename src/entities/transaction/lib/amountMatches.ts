import { roundMoney } from '@/shared'
import type { Transaction, TransactionKind } from '../model/types'

const DEFAULT_LIMIT = 3

function byOccurredOnDesc(a: Transaction, b: Transaction) {
  return b.occurredOn.localeCompare(a.occurredOn)
}

export function matchOperationsByAmount(
  items: Transaction[],
  input: {
    amount: number
    kind: Extract<TransactionKind, 'expense' | 'income'>
    accountId: string
    categoryIds: string[]
    limit?: number
  },
): Transaction[] {
  const amount = roundMoney(input.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !input.accountId) {
    return []
  }
  const allowed = new Set(input.categoryIds)
  if (!allowed.size) {
    return []
  }
  const matches = items.filter((item) => {
    if (item.status !== 'posted' || item.kind !== input.kind) {
      return false
    }
    if (roundMoney(Number(item.amount)) !== amount) {
      return false
    }
    return item.categoryId != null && allowed.has(item.categoryId)
  })
  const current = matches.filter((item) => item.accountId === input.accountId).sort(byOccurredOnDesc)
  const others = matches.filter((item) => item.accountId !== input.accountId).sort(byOccurredOnDesc)
  return [...current, ...others].slice(0, input.limit ?? DEFAULT_LIMIT)
}
