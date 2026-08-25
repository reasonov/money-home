import { describe, expect, it } from 'vitest'
import { isMissingCategoryFk } from '../../api/errors'
import {
  accountBalanceAfterDelta,
  isConflictSyncError,
  isRetryableSyncError,
  purchaseConflictMessage,
  shouldDropOutboxItem,
} from '../conflicts'

describe('purchaseConflictMessage', () => {
  it('allows planned updates', () => {
    expect(purchaseConflictMessage('complete', 'planned')).toBeNull()
    expect(purchaseConflictMessage('cancel', 'planned')).toBeNull()
    expect(purchaseConflictMessage('update', 'planned')).toBeNull()
  })

  it('keeps done purchases done', () => {
    expect(purchaseConflictMessage('complete', 'done')).toBe('Покупка уже проведена')
    expect(purchaseConflictMessage('cancel', 'done')).toBe('Покупка уже проведена')
    expect(purchaseConflictMessage('update', 'done')).toBe('Покупка уже проведена')
  })

  it('reports cancelled purchases', () => {
    expect(purchaseConflictMessage('complete', 'cancelled')).toBe('Покупка уже отменена')
    expect(purchaseConflictMessage('cancel', 'cancelled')).toBe('Покупка уже отменена')
  })
})

describe('accountBalanceAfterDelta', () => {
  it('applies a signed delta', () => {
    expect(accountBalanceAfterDelta(5000, -2000)).toBe(3000)
    expect(accountBalanceAfterDelta(4800, -2000)).toBe(2800)
  })
})

describe('sync error classification', () => {
  it('retries network failures and drops conflicts', () => {
    expect(
      isRetryableSyncError('Нет соединения с интернетом. Проверьте сеть и попробуйте снова'),
    ).toBe(true)
    expect(isRetryableSyncError('Не удалось подключиться к серверу. Попробуйте снова')).toBe(true)
    expect(isConflictSyncError('Purchase is not planned')).toBe(true)
    expect(isConflictSyncError('Покупка уже проведена')).toBe(true)
  })

  it('keeps unknown save errors in the outbox instead of dropping them', () => {
    expect(shouldDropOutboxItem('Не удалось сохранить операцию')).toBe(false)
    expect(shouldDropOutboxItem('Что-то пошло не так')).toBe(false)
    expect(shouldDropOutboxItem('Войдите в аккаунт')).toBe(false)
    expect(
      shouldDropOutboxItem('Нет соединения с интернетом. Проверьте сеть и попробуйте снова'),
    ).toBe(false)
    expect(shouldDropOutboxItem('Категория недоступна')).toBe(true)
    expect(shouldDropOutboxItem('Операция не найдена')).toBe(true)
  })
})

describe('isMissingCategoryFk', () => {
  it('detects postgres category foreign keys', () => {
    expect(
      isMissingCategoryFk({
        code: '23503',
        message: 'insert or update on table "transactions" violates foreign key constraint',
        details: 'Key (category_id)=(abc) is not present in table "categories".',
      }),
    ).toBe(true)
    expect(isMissingCategoryFk({ code: '23505', message: 'duplicate key' })).toBe(false)
    expect(isMissingCategoryFk(null)).toBe(false)
  })
})
