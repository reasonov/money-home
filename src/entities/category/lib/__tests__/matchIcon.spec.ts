import { describe, expect, it } from 'vitest'
import { matchCategoryIcon } from '../matchIcon'

describe('matchCategoryIcon', () => {
  it('matches an icon label exactly', () => {
    expect(matchCategoryIcon('Кофе')).toBe('coffee')
    expect(matchCategoryIcon('Кафе')).toBe('dining')
    expect(matchCategoryIcon('Пицца')).toBe('pizza')
  })

  it('ignores case and surrounding spaces', () => {
    expect(matchCategoryIcon('кофе')).toBe('coffee')
    expect(matchCategoryIcon('  Пицца  ')).toBe('pizza')
  })

  it('returns null when there is no match', () => {
    expect(matchCategoryIcon('')).toBeNull()
    expect(matchCategoryIcon('   ')).toBeNull()
    expect(matchCategoryIcon('Несуществующее')).toBeNull()
    expect(matchCategoryIcon('Коф')).toBeNull()
  })
})
