import type { Transaction, TransactionKind } from '../model/types'
import type { CategorySpendSlice } from './stats'

export type RollupCategory = {
  id: string
  name: string
  color?: string
  icon?: string
  groupId?: string | null
}

export type RollupGroup = {
  id: string
  name: string
  color?: string
  icon?: string
}

function sortSlices(list: CategorySpendSlice[]): CategorySpendSlice[] {
  return [...list].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'))
}

export function rollupCategorySlices(
  items: Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income'>,
  categories: RollupCategory[],
  groups: RollupGroup[],
  drillGroupId?: string | null,
): CategorySpendSlice[] {
  const categoriesById = new Map(categories.map((item) => [item.id, item]))
  const groupsById = new Map(groups.map((item) => [item.id, item]))
  const map = new Map<string, CategorySpendSlice>()

  for (const item of items) {
    if (item.kind !== kind) continue
    const live = item.categoryId ? categoriesById.get(item.categoryId) : undefined
    const groupId = live?.groupId || undefined

    if (drillGroupId) {
      if (groupId !== drillGroupId) continue
      const key = item.categoryId ?? ''
      const existing = map.get(key)
      if (existing) {
        existing.amount += item.amount
        continue
      }
      map.set(key, {
        categoryId: item.categoryId ?? null,
        name: live?.name ?? (item.categoryName?.trim() || 'Без категории'),
        ...(live?.color ?? item.categoryColor ? { color: live?.color ?? item.categoryColor } : {}),
        ...(live?.icon ?? item.categoryIcon ? { icon: live?.icon ?? item.categoryIcon } : {}),
        amount: item.amount,
      })
      continue
    }

    if (!live || !item.categoryId) {
      const existing = map.get('')
      if (existing) {
        existing.amount += item.amount
        continue
      }
      map.set('', {
        categoryId: null,
        name: 'Без категории',
        ...(item.categoryColor ? { color: item.categoryColor } : {}),
        amount: item.amount,
      })
      continue
    }

    if (groupId) {
      const group = groupsById.get(groupId)
      const key = `group:${groupId}`
      const existing = map.get(key)
      if (existing) {
        existing.amount += item.amount
        continue
      }
      map.set(key, {
        categoryId: null,
        groupId,
        name: group?.name ?? live.name,
        ...(group?.color ?? live.color ? { color: group?.color ?? live.color } : {}),
        amount: item.amount,
      })
      continue
    }

    const existing = map.get(live.id)
    if (existing) {
      existing.amount += item.amount
      continue
    }
    map.set(live.id, {
      categoryId: live.id,
      name: live.name,
      ...(live.color ? { color: live.color } : {}),
      ...(live.icon ? { icon: live.icon } : {}),
      amount: item.amount,
    })
  }

  return sortSlices([...map.values()])
}
