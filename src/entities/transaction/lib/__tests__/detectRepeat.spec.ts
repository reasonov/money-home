import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../model/types'
import {
  detectRepeatSuggestion,
  detectRepeatSuggestions,
  type DetectRepeatInput,
  type RepeatRuleMatch,
  type RepeatTemplateMatch,
} from '../detectRepeat'

const AS_OF = '2026-08-20'

function tx(
  partial: Pick<Transaction, 'id' | 'kind' | 'amount' | 'occurredOn'> & Partial<Transaction>,
): Transaction {
  return {
    accountId: 'a1',
    status: 'posted',
    source: 'manual',
    createdBy: 'u1',
    categoryId: 'cat-food',
    title: 'Кофе',
    ...partial,
  }
}

function input(overrides: Partial<DetectRepeatInput> = {}): DetectRepeatInput {
  return {
    asOf: AS_OF,
    rules: [],
    templates: [],
    dismissedKeys: [],
    ...overrides,
  }
}

describe('detectRepeatSuggestion', () => {
  it('detects weekly rule on the same weekday with 7-day gaps', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 500, occurredOn: '2026-07-31' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-07' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2026-08-14', notes: 'пятница' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toMatchObject({
      type: 'rule',
      frequency: 'weekly',
      weekday: 5,
      amount: 500,
      title: 'Кофе',
      notes: 'пятница',
      count: 3,
    })
  })

  it('detects monthly rule on the same month day', () => {
    const items = [
      tx({ id: '1', kind: 'income', amount: 50_000, occurredOn: '2026-06-10', title: 'Зарплата' }),
      tx({ id: '2', kind: 'income', amount: 50_000, occurredOn: '2026-07-10', title: 'Зарплата' }),
      tx({ id: '3', kind: 'income', amount: 50_000, occurredOn: '2026-08-10', title: 'Зарплата' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toMatchObject({
      type: 'rule',
      kind: 'income',
      frequency: 'monthly',
      monthDay: 10,
      amount: 50_000,
    })
  })

  it('suggests favorite when repeats have no weekday or month-day grid', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 350, occurredOn: '2026-08-03' }),
      tx({ id: '2', kind: 'expense', amount: 350, occurredOn: '2026-08-08' }),
      tx({ id: '3', kind: 'expense', amount: 350, occurredOn: '2026-08-11' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toMatchObject({
      type: 'favorite',
      amount: 350,
      categoryId: 'cat-food',
      count: 3,
    })
  })

  it('does not treat sparse same-weekday dates as weekly', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 200, occurredOn: '2025-09-05' }),
      tx({ id: '2', kind: 'expense', amount: 200, occurredOn: '2026-03-06' }),
      tx({ id: '3', kind: 'expense', amount: 200, occurredOn: '2026-08-14' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toMatchObject({
      type: 'favorite',
    })
  })

  it('does not treat day 29–31 as monthly', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 900, occurredOn: '2026-01-31' }),
      tx({ id: '2', kind: 'expense', amount: 900, occurredOn: '2026-03-31' }),
      tx({ id: '3', kind: 'expense', amount: 900, occurredOn: '2026-05-31' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toMatchObject({
      type: 'favorite',
    })
  })

  it('prefers weekly when both patterns exist and the weekday has a 7-day step', () => {
    const items = [
      tx({ id: 'm1', kind: 'expense', amount: 100, occurredOn: '2026-05-14' }),
      tx({ id: 'm2', kind: 'expense', amount: 100, occurredOn: '2026-06-14' }),
      tx({ id: 'w1', kind: 'expense', amount: 100, occurredOn: '2026-07-31' }),
      tx({ id: 'w2', kind: 'expense', amount: 100, occurredOn: '2026-08-07' }),
      tx({ id: 'w3', kind: 'expense', amount: 100, occurredOn: '2026-08-14' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[4]! })).toMatchObject({
      type: 'rule',
      frequency: 'weekly',
      weekday: 5,
    })
  })

  it('prefers monthly when both exist but weekly has no 7-day step', () => {
    const items = [
      tx({ id: 'm1', kind: 'expense', amount: 100, occurredOn: '2026-05-05' }),
      tx({ id: 'w1', kind: 'expense', amount: 100, occurredOn: '2026-06-05' }),
      tx({ id: 'w2', kind: 'expense', amount: 100, occurredOn: '2026-06-19' }),
      tx({ id: 'w3', kind: 'expense', amount: 100, occurredOn: '2026-07-03' }),
      tx({ id: 'm2', kind: 'expense', amount: 100, occurredOn: '2026-08-05' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[4]! })).toMatchObject({
      type: 'rule',
      frequency: 'monthly',
      monthDay: 5,
    })
  })

  it('ignores operations older than 365 days', () => {
    const items = [
      tx({ id: 'old', kind: 'expense', amount: 500, occurredOn: '2025-08-19' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-07' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toBeNull()
  })

  it('returns nothing when the seed date is outside the window', () => {
    const seed = tx({ id: 'old', kind: 'expense', amount: 500, occurredOn: '2025-08-10' })
    const items = [
      seed,
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2025-08-17' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2025-08-24' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed })).toBeNull()
  })

  it('returns nothing for fewer than 3 distinct dates', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 500, occurredOn: '2026-08-07' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
      tx({ id: 'dup', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[1]! })).toBeNull()
  })

  it('skips auto-posted and purchase sources', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 500, occurredOn: '2026-07-31', source: 'expense_rule' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-07', source: 'purchase' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
    ]
    expect(detectRepeatSuggestion(items, { ...input(), seed: items[2]! })).toBeNull()
  })

  it('skips when an active matching rule already exists', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 500, occurredOn: '2026-07-31' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-07' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
    ]
    const rules: RepeatRuleMatch[] = [
      { accountId: 'a1', amount: 500, frequency: 'weekly', weekday: 5, active: true },
    ]
    expect(detectRepeatSuggestion(items, { ...input({ rules }), seed: items[2]! })).toBeNull()
  })

  it('skips favorite when a matching template exists', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 350, occurredOn: '2026-08-03' }),
      tx({ id: '2', kind: 'expense', amount: 350, occurredOn: '2026-08-08' }),
      tx({ id: '3', kind: 'expense', amount: 350, occurredOn: '2026-08-11' }),
    ]
    const templates: RepeatTemplateMatch[] = [{ kind: 'expense', categoryId: 'cat-food', amount: 350 }]
    expect(detectRepeatSuggestion(items, { ...input({ templates }), seed: items[2]! })).toBeNull()
  })

  it('skips dismissed keys', () => {
    const items = [
      tx({ id: '1', kind: 'expense', amount: 500, occurredOn: '2026-07-31' }),
      tx({ id: '2', kind: 'expense', amount: 500, occurredOn: '2026-08-07' }),
      tx({ id: '3', kind: 'expense', amount: 500, occurredOn: '2026-08-14' }),
    ]
    const found = detectRepeatSuggestion(items, { ...input(), seed: items[2]! })
    expect(found).not.toBeNull()
    expect(
      detectRepeatSuggestion(items, {
        ...input({ dismissedKeys: [found!.key] }),
        seed: items[2]!,
      }),
    ).toBeNull()
  })
})

describe('detectRepeatSuggestions', () => {
  it('filters by account and ranks by count', () => {
    const items = [
      tx({ id: 'a1', kind: 'expense', amount: 100, occurredOn: '2026-08-03', accountId: 'a1' }),
      tx({ id: 'a2', kind: 'expense', amount: 100, occurredOn: '2026-08-08', accountId: 'a1' }),
      tx({ id: 'a3', kind: 'expense', amount: 100, occurredOn: '2026-08-11', accountId: 'a1' }),
      tx({ id: 'b1', kind: 'expense', amount: 200, occurredOn: '2026-08-03', accountId: 'a2' }),
      tx({ id: 'b2', kind: 'expense', amount: 200, occurredOn: '2026-08-08', accountId: 'a2' }),
      tx({ id: 'b3', kind: 'expense', amount: 200, occurredOn: '2026-08-11', accountId: 'a2' }),
      tx({ id: 'b4', kind: 'expense', amount: 200, occurredOn: '2026-08-13', accountId: 'a2' }),
    ]
    const all = detectRepeatSuggestions(items, input())
    expect(all[0]).toMatchObject({ accountId: 'a2', amount: 200, count: 4 })
    expect(detectRepeatSuggestions(items, input({ accountId: 'a1' }))).toHaveLength(1)
    expect(detectRepeatSuggestions(items, input({ accountId: 'a1' }))[0]).toMatchObject({
      accountId: 'a1',
      amount: 100,
    })
  })
})
