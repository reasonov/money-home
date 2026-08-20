import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../model/types'
import { matchOperationsByAmount } from '../amountMatches'

function tx(
  partial: Pick<Transaction, 'id' | 'kind' | 'amount' | 'occurredOn'> & Partial<Transaction>,
): Transaction {
  return {
    accountId: 'a1',
    status: 'posted',
    source: 'manual',
    createdBy: 'u1',
    categoryId: 'cat-food',
    ...partial,
  }
}

const cats = ['cat-food', 'cat-taxi']

describe('matchOperationsByAmount', () => {
  it('returns nothing for empty or invalid amount', () => {
    const items = [tx({ id: '1', kind: 'expense', amount: 100, occurredOn: '2026-08-10' })]
    expect(
      matchOperationsByAmount(items, { amount: 0, kind: 'expense', accountId: 'a1', categoryIds: cats }),
    ).toEqual([])
    expect(
      matchOperationsByAmount(items, {
        amount: Number.NaN,
        kind: 'expense',
        accountId: 'a1',
        categoryIds: cats,
      }),
    ).toEqual([])
  })

  it('keeps posted same-kind exact amount with allowed category', () => {
    const items = [
      tx({ id: 'ok', kind: 'expense', amount: 250, occurredOn: '2026-08-10' }),
      tx({ id: 'income', kind: 'income', amount: 250, occurredOn: '2026-08-11' }),
      tx({ id: 'other-sum', kind: 'expense', amount: 251, occurredOn: '2026-08-12' }),
      tx({ id: 'cancelled', kind: 'expense', amount: 250, occurredOn: '2026-08-13', status: 'cancelled' }),
      tx({ id: 'no-cat', kind: 'expense', amount: 250, occurredOn: '2026-08-14', categoryId: undefined }),
      tx({
        id: 'foreign-cat',
        kind: 'expense',
        amount: 250,
        occurredOn: '2026-08-15',
        categoryId: 'cat-rent',
      }),
    ]
    expect(
      matchOperationsByAmount(items, { amount: 250, kind: 'expense', accountId: 'a1', categoryIds: cats }).map(
        (item) => item.id,
      ),
    ).toEqual(['ok'])
  })

  it('takes current account first, then fills from other accounts up to 3', () => {
    const items = [
      tx({ id: 'a-old', kind: 'expense', amount: 100, occurredOn: '2026-08-01', accountId: 'a1' }),
      tx({ id: 'a-new', kind: 'expense', amount: 100, occurredOn: '2026-08-10', accountId: 'a1' }),
      tx({ id: 'b-new', kind: 'expense', amount: 100, occurredOn: '2026-08-20', accountId: 'a2' }),
      tx({ id: 'b-mid', kind: 'expense', amount: 100, occurredOn: '2026-08-15', accountId: 'a2' }),
      tx({ id: 'c', kind: 'expense', amount: 100, occurredOn: '2026-08-18', accountId: 'a3' }),
    ]
    expect(
      matchOperationsByAmount(items, { amount: 100, kind: 'expense', accountId: 'a1', categoryIds: cats }).map(
        (item) => item.id,
      ),
    ).toEqual(['a-new', 'a-old', 'b-new'])
  })

  it('fills only from other accounts when the current one has no matches', () => {
    const items = [
      tx({ id: 'b', kind: 'expense', amount: 80, occurredOn: '2026-08-02', accountId: 'a2' }),
      tx({ id: 'c', kind: 'expense', amount: 80, occurredOn: '2026-08-03', accountId: 'a3' }),
    ]
    expect(
      matchOperationsByAmount(items, { amount: 80, kind: 'expense', accountId: 'a1', categoryIds: cats }).map(
        (item) => item.id,
      ),
    ).toEqual(['c', 'b'])
  })

  it('matches numeric strings from replica payloads', () => {
    const items = [tx({ id: 'ok', kind: 'expense', amount: '250' as unknown as number, occurredOn: '2026-08-10' })]
    expect(
      matchOperationsByAmount(items, { amount: 250, kind: 'expense', accountId: 'a1', categoryIds: cats }).map(
        (item) => item.id,
      ),
    ).toEqual(['ok'])
  })
})
