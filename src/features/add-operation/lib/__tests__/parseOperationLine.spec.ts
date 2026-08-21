import { describe, expect, it } from 'vitest'
import {
  hasParseFields,
  isParseComplete,
  mergeParsedOperationLine,
  parseOperationLine,
  type ParseCategory,
} from '../parseOperationLine'

const cats: ParseCategory[] = [
  { id: 'food', name: 'Продукты' },
  { id: 'cafe', name: 'Кафе' },
  { id: 'salary', name: 'Зарплата' },
]

describe('parseOperationLine', () => {
  it('reads a plain amount and leftover title', () => {
    const parsed = parseOperationLine('пятёрочка 1840', '2026-08-21', cats)
    expect(parsed.amount).toBe(1840)
    expect(parsed.title).toBe('пятёрочка')
    expect(parsed.categoryId).toBeUndefined()
    expect(isParseComplete(parsed)).toBe(false)
  })

  it('reads grouped thousands and a decimal comma', () => {
    expect(parseOperationLine('такси 1 840', '2026-08-21', cats).amount).toBe(1840)
    expect(parseOperationLine('кофе 1840,50', '2026-08-21', cats).amount).toBe(1840.5)
  })

  it('reads thousand multipliers', () => {
    expect(parseOperationLine('зарплата 85 тысяч', '2026-08-21', cats).amount).toBe(85000)
    expect(parseOperationLine('аванс 85 тыс', '2026-08-21', cats).amount).toBe(85000)
    expect(parseOperationLine('премия 85к', '2026-08-21', cats).amount).toBe(85000)
    expect(parseOperationLine('1,5 тысячи', '2026-08-21', cats).amount).toBe(1500)
  })

  it('does not treat к inside a word as a multiplier', () => {
    const parsed = parseOperationLine('кофе 250', '2026-08-21', cats)
    expect(parsed.amount).toBe(250)
    expect(parsed.title).toBe('кофе')
  })

  it('reads relative dates from today', () => {
    expect(parseOperationLine('кино вчера 600', '2026-08-21', cats).occurredOn).toBe('2026-08-20')
    expect(parseOperationLine('сегодня 100', '2026-08-21', cats).occurredOn).toBe('2026-08-21')
    expect(parseOperationLine('позавчера 50', '2026-08-21', cats).occurredOn).toBe('2026-08-19')
  })

  it('matches a category name in the text and marks complete', () => {
    const parsed = parseOperationLine('продукты 1840', '2026-08-21', cats)
    expect(parsed.categoryId).toBe('food')
    expect(parsed.amount).toBe(1840)
    expect(parsed.title).toBeUndefined()
    expect(isParseComplete(parsed)).toBe(true)
  })

  it('prefers the longest category name', () => {
    const parsed = parseOperationLine(
      'кафе 300',
      '2026-08-21',
      [{ id: 'c', name: 'Кафе' }, { id: 'k', name: 'Ка' }],
    )
    expect(parsed.categoryId).toBe('c')
  })
})

describe('mergeParsedOperationLine', () => {
  it('keeps local amount and date and takes remote category', () => {
    const merged = mergeParsedOperationLine(
      { amount: 600, occurredOn: '2026-08-20', title: 'кино' },
      { amount: 999, categoryId: 'cafe', title: 'Кино' },
      cats,
      'кино вчера 600',
    )
    expect(merged.amount).toBe(600)
    expect(merged.occurredOn).toBe('2026-08-20')
    expect(merged.categoryId).toBe('cafe')
    expect(merged.title).toBe('Кино')
    expect(isParseComplete(merged)).toBe(true)
  })

  it('drops a category id that is not in the list', () => {
    const merged = mergeParsedOperationLine({}, { categoryId: 'missing', amount: 100 }, cats)
    expect(merged.categoryId).toBeUndefined()
    expect(merged.amount).toBe(100)
    expect(hasParseFields(merged)).toBe(true)
  })

  it('keeps local title when remote title is not in the source', () => {
    const merged = mergeParsedOperationLine(
      { amount: 677, title: 'бургер' },
      {
        amount: 677,
        title: 'бургерздесьвсехорошононадократкострокудо80символовнепревышатьнояужтенаписалпрост',
      },
      cats,
      'бургер 677',
    )
    expect(merged.amount).toBe(677)
    expect(merged.title).toBe('бургер')
  })
})
