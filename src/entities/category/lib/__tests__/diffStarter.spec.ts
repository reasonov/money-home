import { describe, expect, it } from 'vitest'
import type { Category, CategoryGroup } from '../../model/types'
import {
  diffStarterCatalog,
  hasMissingStarter,
  missingStarterCategoryKeys,
  normalizeStarterName,
} from '../diffStarter'
import { STARTER_CATALOG } from '../starterCatalog'

function category(
  overrides: Partial<Category> & Pick<Category, 'id' | 'kind' | 'name'>,
): Category {
  return {
    color: '#15803D',
    icon: 'other',
    accountIds: ['acc-1'],
    colorManual: false,
    sortOrder: 0,
    ...overrides,
  }
}

function group(
  overrides: Partial<CategoryGroup> & Pick<CategoryGroup, 'id' | 'kind' | 'name'>,
): CategoryGroup {
  return {
    color: '#15803D',
    icon: 'other',
    accountIds: ['acc-1'],
    sortOrder: 0,
    ...overrides,
  }
}

describe('normalizeStarterName', () => {
  it('trims, lowercases and maps ё', () => {
    expect(normalizeStarterName('  Ёда  ')).toBe('еда')
  })
})

describe('diffStarterCatalog', () => {
  it('marks everything missing on an empty catalog', () => {
    const diff = diffStarterCatalog(STARTER_CATALOG, [], [])
    expect(hasMissingStarter(diff)).toBe(true)
    expect(diff.groups).toHaveLength(STARTER_CATALOG.length)
    expect(diff.groups.every((item) => !item.existingGroupId)).toBe(true)
    expect(diff.groups.every((item) => item.categories.every((cat) => !cat.present))).toBe(true)
    expect(missingStarterCategoryKeys(diff).length).toBeGreaterThan(10)
  })

  it('skips a category that already exists ungrouped', () => {
    const diff = diffStarterCatalog(
      STARTER_CATALOG,
      [category({ id: 'c1', kind: 'expense', name: 'Продукты' })],
      [],
    )
    const food = diff.groups.find((item) => item.key === 'food')
    expect(food?.existingGroupId).toBeUndefined()
    expect(food?.categories.find((item) => item.key === 'food-grocery')?.present).toBe(true)
    expect(food?.categories.find((item) => item.key === 'food-dining')?.present).toBe(false)
  })

  it('reuses a group with the same name and only missing children', () => {
    const diff = diffStarterCatalog(
      STARTER_CATALOG,
      [category({ id: 'c1', kind: 'expense', name: 'Кафе', groupId: 'g-food' })],
      [group({ id: 'g-food', kind: 'expense', name: 'Еда', color: '#0F766E' })],
    )
    const food = diff.groups.find((item) => item.key === 'food')
    expect(food?.existingGroupId).toBe('g-food')
    expect(food?.color).toBe('#0F766E')
    expect(food?.categories.find((item) => item.key === 'food-dining')?.present).toBe(true)
    expect(food?.categories.find((item) => item.key === 'food-grocery')?.present).toBe(false)
  })

  it('does not match the same name across kinds', () => {
    const diff = diffStarterCatalog(
      STARTER_CATALOG,
      [category({ id: 'c1', kind: 'expense', name: 'Другое' })],
      [],
    )
    const expenseOther = diff.groups.find((item) => item.key === 'other')
    const income = diff.groups.find((item) => item.key === 'income')
    expect(expenseOther?.categories[0]?.present).toBe(true)
    expect(income?.categories.find((item) => item.key === 'income-other')?.present).toBe(false)
  })

  it('treats ё and case as the same name', () => {
    const diff = diffStarterCatalog(
      STARTER_CATALOG,
      [category({ id: 'c1', kind: 'expense', name: 'ПРОДУКТЫ' })],
      [group({ id: 'g1', kind: 'expense', name: 'ёда' })],
    )
    const food = diff.groups.find((item) => item.key === 'food')
    expect(food?.existingGroupId).toBe('g1')
    expect(food?.categories.find((item) => item.key === 'food-grocery')?.present).toBe(true)
  })

  it('reports no missing when every starter name exists', () => {
    const categories = STARTER_CATALOG.flatMap((item) =>
      item.categories.map((cat, index) =>
        category({
          id: `${item.key}-${index}`,
          kind: item.kind,
          name: cat.name,
        }),
      ),
    )
    const diff = diffStarterCatalog(STARTER_CATALOG, categories, [])
    expect(hasMissingStarter(diff)).toBe(false)
    expect(missingStarterCategoryKeys(diff)).toEqual([])
  })
})
