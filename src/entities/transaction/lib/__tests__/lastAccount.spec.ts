import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../model/types'
import { lastOperationAccountId } from '../lastAccount'

function tx(
  partial: Pick<Transaction, 'id' | 'kind' | 'accountId'> & Partial<Transaction>,
): Transaction {
  return {
    status: 'posted',
    source: 'manual',
    createdBy: 'u1',
    amount: 100,
    occurredOn: '2026-08-10',
    ...partial,
  }
}

const accounts = ['a1', 'a2']

describe('lastOperationAccountId', () => {
  it('returns null when there are no matching operations', () => {
    expect(lastOperationAccountId([], 'expense', accounts)).toBeNull()
    expect(
      lastOperationAccountId(
        [tx({ id: 'i1', kind: 'income', accountId: 'a1' })],
        'expense',
        accounts,
      ),
    ).toBeNull()
  })

  it('ignores cancelled, other kinds, transfers and unknown accounts', () => {
    const items = [
      tx({ id: 'cancelled', kind: 'expense', accountId: 'a2', status: 'cancelled', createdAt: '2026-08-19T12:00:00.000Z' }),
      tx({ id: 'income', kind: 'income', accountId: 'a2', createdAt: '2026-08-19T12:00:00.000Z' }),
      tx({ id: 'transfer', kind: 'transfer', accountId: 'a2', createdAt: '2026-08-19T12:00:00.000Z' }),
      tx({ id: 'gone', kind: 'expense', accountId: 'a3', createdAt: '2026-08-19T12:00:00.000Z' }),
      tx({ id: 'ok', kind: 'expense', accountId: 'a1', createdAt: '2026-08-01T12:00:00.000Z' }),
    ]
    expect(lastOperationAccountId(items, 'expense', accounts)).toBe('a1')
  })

  it('prefers the most recently created operation over a later occurredOn', () => {
    const items = [
      tx({
        id: 'old-created',
        kind: 'expense',
        accountId: 'a1',
        occurredOn: '2026-08-18',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
      tx({
        id: 'new-created',
        kind: 'expense',
        accountId: 'a2',
        occurredOn: '2026-08-10',
        createdAt: '2026-08-19T10:00:00.000Z',
      }),
    ]
    expect(lastOperationAccountId(items, 'expense', accounts)).toBe('a2')
  })

  it('falls back to occurredOn when createdAt is missing', () => {
    const items = [
      tx({ id: 'earlier', kind: 'income', accountId: 'a1', occurredOn: '2026-08-10' }),
      tx({ id: 'later', kind: 'income', accountId: 'a2', occurredOn: '2026-08-12' }),
    ]
    expect(lastOperationAccountId(items, 'income', accounts)).toBe('a2')
  })
})
