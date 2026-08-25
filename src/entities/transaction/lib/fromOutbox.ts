import { roundMoney } from '@/shared'
import type { Transaction } from '../model/types'

export function transactionFromOutboxPayload(
  payload: Record<string, unknown>,
  fallbackId?: string,
): Transaction | null {
  const id = typeof payload.id === 'string' ? payload.id : fallbackId
  const kind = payload.kind === 'income' || payload.kind === 'expense' ? payload.kind : null
  const amount = roundMoney(Number(payload.amount))
  const accountId = typeof payload.accountId === 'string' ? payload.accountId : ''
  const createdBy = typeof payload.createdBy === 'string' ? payload.createdBy : ''
  const occurredOn = typeof payload.occurredOn === 'string' ? payload.occurredOn : ''
  if (!id || !kind || !accountId || !createdBy || !occurredOn || !Number.isFinite(amount) || amount <= 0) {
    return null
  }
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const notes = typeof payload.notes === 'string' ? payload.notes.trim() : ''
  return {
    id,
    accountId,
    kind,
    status: 'posted',
    source: 'manual',
    amount,
    occurredOn,
    createdBy,
    ...(typeof payload.createdAt === 'string' ? { createdAt: payload.createdAt } : {}),
    ...(typeof payload.categoryId === 'string' ? { categoryId: payload.categoryId } : {}),
    ...(typeof payload.categoryName === 'string' ? { categoryName: payload.categoryName } : {}),
    ...(typeof payload.categoryColor === 'string' ? { categoryColor: payload.categoryColor } : {}),
    ...(typeof payload.categoryIcon === 'string' ? { categoryIcon: payload.categoryIcon } : {}),
    ...(title ? { title } : {}),
    ...(notes ? { notes } : {}),
  }
}

export function pendingInsertAmountDelta(tx: Transaction): number {
  if (tx.kind === 'income') {
    return tx.amount
  }
  if (tx.kind === 'expense') {
    return -tx.amount
  }
  return 0
}
