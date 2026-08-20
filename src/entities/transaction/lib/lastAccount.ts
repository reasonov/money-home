import type { Transaction, TransactionKind } from '../model/types'

export function lastOperationAccountId(
  items: Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income'>,
  accountIds: Iterable<string>,
): string | null {
  const valid = new Set(accountIds)
  if (!valid.size) {
    return null
  }
  const matches = items.filter(
    (item) => item.status === 'posted' && item.kind === kind && valid.has(item.accountId),
  )
  if (!matches.length) {
    return null
  }
  matches.sort(
    (a, b) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '') ||
      b.occurredOn.localeCompare(a.occurredOn) ||
      b.id.localeCompare(a.id),
  )
  return matches[0]?.accountId ?? null
}
