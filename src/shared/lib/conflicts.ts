import { roundMoney } from './parseAmount'

export type PurchaseRemoteStatus = 'planned' | 'done' | 'cancelled'

export function purchaseConflictMessage(
  action: 'complete' | 'cancel' | 'update',
  remoteStatus: PurchaseRemoteStatus,
): string | null {
  if (remoteStatus === 'planned') {
    return null
  }
  if (action === 'complete' && remoteStatus === 'done') {
    return 'Покупка уже проведена'
  }
  if (action === 'cancel' && remoteStatus === 'cancelled') {
    return 'Покупка уже отменена'
  }
  if (remoteStatus === 'done') {
    return 'Покупка уже проведена'
  }
  return 'Покупка уже отменена'
}

export function accountBalanceAfterDelta(current: number, delta: number): number {
  return roundMoney(current + delta)
}

export function isRetryableSyncError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('нет соединения') ||
    lower.includes('не удалось подключиться') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('internet') ||
    lower.includes('timeout') ||
    lower.includes('timed out')
  )
}

export function isConflictSyncError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('purchase is not planned') ||
    lower.includes('покупка уже') ||
    lower.includes('transaction not found') ||
    lower.includes('occurrence not found') ||
    lower.includes('not an account member') ||
    lower.includes('нет доступа') ||
    lower.includes('операция не найдена')
  )
}
