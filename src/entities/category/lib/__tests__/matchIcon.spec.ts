import { describe, expect, it } from 'vitest'
import { matchCategoryIcon } from '../matchIcon'

describe('matchCategoryIcon', () => {
  it('matches an icon label exactly', () => {
    expect(matchCategoryIcon('Кофе')).toBe('coffee')
    expect(matchCategoryIcon('Кафе')).toBe('dining')
    expect(matchCategoryIcon('Пицца')).toBe('pizza')
    expect(matchCategoryIcon('Маникюр')).toBe('manicure')
    expect(matchCategoryIcon('Парикмахер')).toBe('haircut')
    expect(matchCategoryIcon('Косметолог')).toBe('cosmetics')
    expect(matchCategoryIcon('Уход')).toBe('care')
  })

  it('matches common aliases', () => {
    expect(matchCategoryIcon('Педикюр')).toBe('manicure')
    expect(matchCategoryIcon('Парикмахерская')).toBe('haircut')
    expect(matchCategoryIcon('Стрижка')).toBe('haircut')
    expect(matchCategoryIcon('Косметология')).toBe('cosmetics')
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
