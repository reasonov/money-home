import { describe, expect, it } from 'vitest'
import { ruleDraftFromOperation } from '../ruleDraft'

const source = {
  accountId: 'a1',
  amount: 1500,
  title: '  Кофе  ',
  categoryId: 'cat-1',
}

describe('ruleDraftFromOperation', () => {
  it('uses monthly frequency when the day is 1–28', () => {
    expect(
      ruleDraftFromOperation({
        ...source,
        occurredOn: '2026-08-10',
      }),
    ).toEqual({
      accountId: 'a1',
      amount: 1500,
      title: 'Кофе',
      categoryId: 'cat-1',
      frequency: 'monthly',
      monthDay: 10,
    })
  })

  it('uses weekly frequency when the day is after the 28th', () => {
    expect(
      ruleDraftFromOperation({
        accountId: 'a1',
        amount: 900,
        occurredOn: '2026-08-31',
      }),
    ).toEqual({
      accountId: 'a1',
      amount: 900,
      frequency: 'weekly',
      weekday: 1,
    })
  })

  it('omits empty title and category', () => {
    expect(
      ruleDraftFromOperation({
        accountId: 'a2',
        amount: 200,
        occurredOn: '2026-01-01',
        title: '   ',
        categoryId: '',
      }),
    ).toEqual({
      accountId: 'a2',
      amount: 200,
      frequency: 'monthly',
      monthDay: 1,
    })
  })
})
