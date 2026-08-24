import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../model/types'
import { rollupCategorySlices } from '../categoryRollup'

function tx(
  partial: Pick<Transaction, 'id' | 'kind' | 'amount' | 'occurredOn'> & Partial<Transaction>,
): Transaction {
  return {
    accountId: 'a1',
    status: 'posted',
    source: 'manual',
    createdBy: 'u1',
    ...partial,
  }
}

const groups = [{ id: 'food', name: 'Питание', color: '#15803D', icon: 'grocery' }]
const categories = [
  {
    id: 'cafe',
    name: 'Кафе',
    color: '#16A34A',
    icon: 'dining',
    groupId: 'food',
  },
  {
    id: 'taxi',
    name: 'Такси',
    color: '#1D4ED8',
    icon: 'taxi',
  },
]

describe('rollupCategorySlices', () => {
  const items = [
    tx({
      id: 'e1',
      kind: 'expense',
      amount: 100,
      occurredOn: '2026-08-10',
      categoryId: 'cafe',
      categoryName: 'Кафе',
      categoryColor: '#16A34A',
    }),
    tx({
      id: 'e2',
      kind: 'expense',
      amount: 40,
      occurredOn: '2026-08-11',
      categoryId: 'cafe',
      categoryName: 'Кафе',
    }),
    tx({
      id: 'e3',
      kind: 'expense',
      amount: 50,
      occurredOn: '2026-08-12',
      categoryId: 'taxi',
      categoryName: 'Такси',
    }),
    tx({
      id: 'e4',
      kind: 'expense',
      amount: 20,
      occurredOn: '2026-08-13',
    }),
  ]

  it('rolls children into the current group and keeps ungrouped plus uncategorized', () => {
    expect(rollupCategorySlices(items, 'expense', categories, groups)).toEqual([
      {
        categoryId: null,
        groupId: 'food',
        name: 'Питание',
        color: '#15803D',
        amount: 140,
      },
      {
        categoryId: 'taxi',
        name: 'Такси',
        color: '#1D4ED8',
        icon: 'taxi',
        amount: 50,
      },
      {
        categoryId: null,
        name: 'Без категории',
        amount: 20,
      },
    ])
  })

  it('drills into children of one group', () => {
    expect(rollupCategorySlices(items, 'expense', categories, groups, 'food')).toEqual([
      {
        categoryId: 'cafe',
        name: 'Кафе',
        color: '#16A34A',
        icon: 'dining',
        amount: 140,
      },
    ])
  })

  it('changes the overview when group_id moves', () => {
    const moved = categories.map((item) =>
      item.id === 'taxi' ? { ...item, groupId: 'food' } : item,
    )
    const overview = rollupCategorySlices(items, 'expense', moved, groups)
    expect(overview.find((item) => item.groupId === 'food')?.amount).toBe(190)
    expect(overview.some((item) => item.categoryId === 'taxi')).toBe(false)
  })
})
