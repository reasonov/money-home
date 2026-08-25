import { describe, expect, it } from 'vitest'
import { pendingInsertAmountDelta, transactionFromOutboxPayload } from '../fromOutbox'

describe('transactionFromOutboxPayload', () => {
  const payload = {
    id: 'tx-1',
    accountId: 'acc-1',
    kind: 'expense',
    amount: 250.4,
    occurredOn: '2026-08-24',
    createdBy: 'user-1',
    categoryId: 'cat-1',
    categoryName: 'Еда',
    title: 'Кофе',
  }

  it('rebuilds a posted manual transaction from the outbox payload', () => {
    expect(transactionFromOutboxPayload(payload)).toEqual({
      id: 'tx-1',
      accountId: 'acc-1',
      kind: 'expense',
      status: 'posted',
      source: 'manual',
      amount: 250.4,
      occurredOn: '2026-08-24',
      createdBy: 'user-1',
      categoryId: 'cat-1',
      categoryName: 'Еда',
      title: 'Кофе',
    })
  })

  it('uses fallback id and ignores invalid payloads', () => {
    expect(transactionFromOutboxPayload({ ...payload, id: undefined }, 'tx-2')?.id).toBe('tx-2')
    expect(transactionFromOutboxPayload({ ...payload, kind: 'transfer' })).toBeNull()
    expect(transactionFromOutboxPayload({ ...payload, amount: 0 })).toBeNull()
    expect(transactionFromOutboxPayload({ ...payload, accountId: '' })).toBeNull()
  })
})

describe('pendingInsertAmountDelta', () => {
  it('applies income and expense signs', () => {
    const base = transactionFromOutboxPayload({
      id: 'tx-1',
      accountId: 'acc-1',
      kind: 'expense',
      amount: 100,
      occurredOn: '2026-08-24',
      createdBy: 'user-1',
    })!
    expect(pendingInsertAmountDelta(base)).toBe(-100)
    expect(pendingInsertAmountDelta({ ...base, kind: 'income' })).toBe(100)
  })
})
