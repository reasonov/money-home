import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation } from '@/shared'
import { useSessionStore } from '@/entities/session'
import { fetchCategoryCatalog } from '../api/categoryApi'
import { applyGroupRecolor, colorForJoinGroup, familyByBase, nextFreeShade } from '../lib/colorFamilies'
import type { StarterCatalogDiff } from '../lib/diffStarter'
import type { Category, CategoryGroup, CategoryKind } from './types'

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const set = new Set(left)
  return right.every((id) => set.has(id))
}

export const useCategoryStore = defineStore('category', () => {
  const items = ref<Category[]>([])
  const groups = ref<CategoryGroup[]>([])

  const expense = computed(() =>
    items.value
      .filter((item) => item.kind === 'expense')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
  )
  const income = computed(() =>
    items.value
      .filter((item) => item.kind === 'income')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
  )

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  function getGroupById(id: string) {
    return groups.value.find((item) => item.id === id)
  }

  function effectiveAccountIds(category: Category): string[] {
    if (!category.groupId) return category.accountIds
    return getGroupById(category.groupId)?.accountIds ?? category.accountIds
  }

  function syncInheritedAccounts() {
    items.value = items.value.map((cat) => {
      if (!cat.groupId) return cat
      const group = getGroupById(cat.groupId)
      if (!group) return cat
      if (sameIds(cat.accountIds, group.accountIds)) return cat
      return { ...cat, accountIds: [...group.accountIds] }
    })
  }

  function upsert(category: Category) {
    const next: Category = category.groupId
      ? {
          ...category,
          accountIds: getGroupById(category.groupId)?.accountIds ?? category.accountIds,
        }
      : category
    const index = items.value.findIndex((item) => item.id === next.id)
    if (index === -1) {
      items.value = [...items.value, next]
      return
    }
    const copy = [...items.value]
    copy[index] = next
    items.value = copy
  }

  function upsertGroup(group: CategoryGroup) {
    const index = groups.value.findIndex((item) => item.id === group.id)
    if (index === -1) {
      groups.value = [...groups.value, group]
    } else {
      const copy = [...groups.value]
      copy[index] = group
      groups.value = copy
    }
    syncInheritedAccounts()
  }

  function removeLocal(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function dissolveGroupLocal(id: string) {
    const group = getGroupById(id)
    items.value = items.value.map((cat) => {
      if (cat.groupId !== id) return cat
      return {
        ...cat,
        groupId: undefined,
        accountIds: group ? [...group.accountIds] : cat.accountIds,
      }
    })
    groups.value = groups.value.filter((item) => item.id !== id)
  }

  function forAccount(accountId: string, kind?: CategoryKind) {
    return items.value.filter(
      (item) =>
        effectiveAccountIds(item).includes(accountId) && (kind == null || item.kind === kind),
    )
  }

  function groupsForAccount(accountId: string, kind?: CategoryKind) {
    return groups.value.filter(
      (item) =>
        item.accountIds.includes(accountId) && (kind == null || item.kind === kind),
    )
  }

  function bindOptions(kind?: CategoryKind) {
    const list = kind
      ? items.value.filter((item) => item.kind === kind)
      : items.value
    const ungrouped = list.filter((item) => !item.groupId)
    const groupList = kind
      ? groups.value.filter((item) => item.kind === kind)
      : groups.value
    return { groups: groupList, categories: ungrouped }
  }

  function hydrate(next: Category[], nextGroups: CategoryGroup[] = []) {
    groups.value = nextGroups
    items.value = next.map((cat) =>
      cat.groupId
        ? {
            ...cat,
            colorManual: Boolean(cat.colorManual),
            sortOrder: cat.sortOrder ?? 0,
            accountIds: getGroupById(cat.groupId)?.accountIds ?? cat.accountIds,
          }
        : { ...cat, colorManual: Boolean(cat.colorManual), sortOrder: cat.sortOrder ?? 0 },
    )
  }

  function bindAccounts(accountId: string, selectedIds: string[]) {
    const selected = new Set(selectedIds)
    groups.value = groups.value.map((group) => {
      const has = group.accountIds.includes(accountId)
      const want = selected.has(group.id)
      if (has === want) return group
      return {
        ...group,
        accountIds: want
          ? [...group.accountIds, accountId]
          : group.accountIds.filter((id) => id !== accountId),
      }
    })
    items.value = items.value.map((cat) => {
      if (cat.groupId) {
        const group = getGroupById(cat.groupId)
        return group ? { ...cat, accountIds: [...group.accountIds] } : cat
      }
      const has = cat.accountIds.includes(accountId)
      const want = selected.has(cat.id)
      if (has === want) return cat
      return {
        ...cat,
        accountIds: want
          ? [...cat.accountIds, accountId]
          : cat.accountIds.filter((id) => id !== accountId),
      }
    })
  }

  async function load() {
    const catalog = await fetchCategoryCatalog()
    hydrate(catalog.categories, catalog.groups)
  }

  function nextSortOrder(kind: CategoryKind, groupId?: string | null) {
    const pool = groupId
      ? items.value.filter((item) => item.groupId === groupId)
      : items.value.filter((item) => item.kind === kind && !item.groupId)
    return pool.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
  }

  function nextGroupSortOrder(kind: CategoryKind) {
    return (
      groups.value
        .filter((item) => item.kind === kind)
        .reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
    )
  }

  function autoShadeForGroup(groupId: string, excludeId?: string) {
    const group = getGroupById(groupId)
    const family = group ? familyByBase(group.color) : undefined
    if (!group || !family) return group?.color ?? ''
    const used = items.value
      .filter((item) => item.groupId === groupId && item.id !== excludeId)
      .map((item) => item.color)
    return nextFreeShade(family, used)
  }

  async function save(input: {
    id?: string
    kind: CategoryKind
    name: string
    color: string
    icon: string
    accountIds: string[]
    groupId?: string | null
    colorManual?: boolean
    sortOrder?: number
  }) {
    assertWritable()
    const id = input.id ?? createUuid()
    const groupId = input.groupId || undefined
    const accountIds = groupId
      ? [...(getGroupById(groupId)?.accountIds ?? input.accountIds)]
      : input.accountIds
    const category: Category = {
      id,
      kind: input.kind,
      name: input.name,
      color: input.color,
      icon: input.icon,
      accountIds,
      ...(groupId ? { groupId } : {}),
      colorManual: Boolean(input.colorManual),
      sortOrder: input.sortOrder ?? getById(id)?.sortOrder ?? nextSortOrder(input.kind, groupId),
    }
    upsert(category)
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    await enqueueMutation(
      userId,
      'upsertCategory',
      {
        input: {
          ...input,
          id,
          accountIds,
          groupId: groupId ?? null,
          colorManual: category.colorManual,
          sortOrder: category.sortOrder,
        },
      },
      id,
    )
    return category
  }

  async function saveGroup(input: {
    id?: string
    kind: CategoryKind
    name: string
    color: string
    icon: string
    accountIds: string[]
    sortOrder?: number
  }) {
    assertWritable()
    const id = input.id ?? createUuid()
    const previous = getGroupById(id)
    const group: CategoryGroup = {
      id,
      kind: input.kind,
      name: input.name,
      color: input.color,
      icon: input.icon,
      accountIds: input.accountIds,
      sortOrder: input.sortOrder ?? previous?.sortOrder ?? nextGroupSortOrder(input.kind),
    }
    const groupedChildren = items.value.filter((item) => item.groupId === id)
    const recolored =
      previous && previous.color !== group.color
        ? applyGroupRecolor(
            groupedChildren.map((child) => ({ color: child.color })),
            previous.color,
            group.color,
          )
        : groupedChildren.map((child) => child.color)
    const childColors =
      previous && previous.color !== group.color
        ? groupedChildren
            .map((child, index) => ({ id: child.id, color: recolored[index]! }))
            .filter((row, index) => groupedChildren[index]?.color !== row.color)
        : []

    if (childColors.length) {
      const colorById = new Map(childColors.map((row) => [row.id, row.color]))
      items.value = items.value.map((cat) => {
        const nextColor = colorById.get(cat.id)
        return nextColor ? { ...cat, color: nextColor, colorManual: false } : cat
      })
    }

    upsertGroup(group)
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    await enqueueMutation(
      userId,
      'upsertCategoryGroup',
      {
        input: {
          ...input,
          id,
          sortOrder: group.sortOrder,
          ...(childColors.length ? { childColors } : {}),
        },
      },
      id,
    )
    return group
  }

  async function moveToGroup(categoryId: string, groupId: string | null) {
    const category = getById(categoryId)
    if (!category) {
      throw new Error('Категория не найдена')
    }
    const currentGroupId = category.groupId || null
    const nextGroupId = groupId || null
    if (currentGroupId === nextGroupId) return category

    if (nextGroupId) {
      const group = getGroupById(nextGroupId)
      if (!group || group.kind !== category.kind) {
        throw new Error('Группа не найдена')
      }
      const used = items.value
        .filter((item) => item.groupId === nextGroupId && item.id !== categoryId)
        .map((item) => item.color)
      const fromBase = currentGroupId ? getGroupById(currentGroupId)?.color : undefined
      return save({
        id: category.id,
        kind: category.kind,
        name: category.name,
        icon: category.icon,
        accountIds: [...group.accountIds],
        groupId: nextGroupId,
        color: colorForJoinGroup(category.color, group.color, used, fromBase),
        colorManual: false,
        sortOrder: nextSortOrder(category.kind, nextGroupId),
      })
    }

    const previous = currentGroupId ? getGroupById(currentGroupId) : undefined
    return save({
      id: category.id,
      kind: category.kind,
      name: category.name,
      color: category.color,
      icon: category.icon,
      accountIds: previous ? [...previous.accountIds] : category.accountIds,
      groupId: null,
      colorManual: false,
      sortOrder: nextSortOrder(category.kind, null),
    })
  }

  async function remove(id: string) {
    assertWritable()
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    removeLocal(id)
    await enqueueMutation(userId, 'deleteCategory', { id }, id)
  }

  async function removeGroup(id: string) {
    assertWritable()
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    dissolveGroupLocal(id)
    await enqueueMutation(userId, 'deleteCategoryGroup', { id }, id)
  }

  async function applyStarter(
    accountIds: string[],
    diff: StarterCatalogDiff,
    selectedCategoryKeys: string[],
  ) {
    const selected = new Set(selectedCategoryKeys)
    if (!selected.size || !accountIds.length) return 0

    let created = 0
    for (const group of diff.groups) {
      const toCreate = group.categories.filter((item) => !item.present && selected.has(item.key))
      if (!toCreate.length) continue

      let groupId = group.existingGroupId
      if (!groupId) {
        const saved = await saveGroup({
          kind: group.kind,
          name: group.name,
          color: group.color,
          icon: 'other',
          accountIds,
        })
        groupId = saved.id
      }

      const used = items.value.filter((item) => item.groupId === groupId).map((item) => item.color)
      const family = familyByBase(group.color)

      for (const item of toCreate) {
        const color = family ? nextFreeShade(family, used) : group.color
        used.push(color)
        await save({
          kind: group.kind,
          name: item.name,
          color,
          icon: item.icon,
          accountIds,
          groupId,
          colorManual: false,
        })
        created += 1
      }
    }
    return created
  }

  function reset() {
    items.value = []
    groups.value = []
  }

  return {
    items,
    groups,
    expense,
    income,
    upsert,
    upsertGroup,
    removeLocal,
    dissolveGroupLocal,
    forAccount,
    groupsForAccount,
    bindOptions,
    getById,
    getGroupById,
    hydrate,
    bindAccounts,
    load,
    save,
    saveGroup,
    moveToGroup,
    applyStarter,
    remove,
    removeGroup,
    reset,
    nextSortOrder,
    nextGroupSortOrder,
    autoShadeForGroup,
  }
})
