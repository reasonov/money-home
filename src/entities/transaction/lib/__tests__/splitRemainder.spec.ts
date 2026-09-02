import { describe, expect, it } from 'vitest'
import { roundMoney } from '@/shared'
import {
  remainderAfterSplits,
  splitRemainder,
  splitRemainderMessage,
  splitSavedToast,
} from '../splitRemainder'

describe('splitRemainder', () => {
  it('returns the full total when there are no parts', () => {
    expect(splitRemainder(1840, 'food', [])).toEqual({
      ok: true,
      remainder: 1840,
      parts: [],
    })
  })

  it('keeps the remainder in the main category', () => {
    expect(splitRemainder(1840, 'food', [{ categoryId: 'smokes', amount: 250 }])).toEqual({
      ok: true,
      remainder: 1590,
      parts: [{ categoryId: 'smokes', amount: 250 }],
    })
  })

  it('rounds each part before subtracting', () => {
    const part = roundMoney(2.333)
    expect(part).toBe(2.33)
    expect(splitRemainder(10, 'food', [{ categoryId: 'smokes', amount: 2.333 }])).toEqual({
      ok: true,
      remainder: 7.67,
      parts: [{ categoryId: 'smokes', amount: 2.33 }],
    })
  })

  it('rejects a remainder of zero or less', () => {
    expect(splitRemainder(250, 'food', [{ categoryId: 'smokes', amount: 250 }])).toMatchObject({
      ok: false,
      remainder: 0,
      error: 'amount',
    })
    expect(splitRemainder(250, 'food', [{ categoryId: 'smokes', amount: 300 }])).toMatchObject({
      ok: false,
      error: 'amount',
    })
  })

  it('rejects a part without a positive amount', () => {
    expect(splitRemainder(1840, 'food', [{ categoryId: 'smokes', amount: 0 }])).toMatchObject({
      ok: false,
      error: 'amount',
    })
  })

  it('rejects duplicate or empty categories', () => {
    expect(splitRemainder(1840, 'food', [{ categoryId: 'food', amount: 250 }])).toMatchObject({
      ok: false,
      error: 'categories',
    })
    expect(
      splitRemainder(1840, 'food', [
        { categoryId: 'smokes', amount: 100 },
        { categoryId: 'smokes', amount: 50 },
      ]),
    ).toMatchObject({ ok: false, error: 'categories' })
    expect(splitRemainder(1840, 'food', [{ categoryId: '', amount: 250 }])).toMatchObject({
      ok: false,
      error: 'categories',
    })
  })
})

describe('remainderAfterSplits', () => {
  it('ignores incomplete draft amounts', () => {
    expect(remainderAfterSplits(1840, [{ amount: '' }, { amount: 250 }])).toBe(1590)
  })
})

describe('copy', () => {
  it('maps errors and toasts', () => {
    expect(splitRemainderMessage('amount')).toBe('Сумма выделенного должна быть меньше итога')
    expect(splitRemainderMessage('categories')).toBe('Выберите разные категории')
    expect(splitSavedToast('expense', 1)).toBe('Расход сохранён')
    expect(splitSavedToast('expense', 2)).toBe('Сохранены 2 расхода')
    expect(splitSavedToast('income', 5)).toBe('Сохранены 5 доходов')
  })
})
