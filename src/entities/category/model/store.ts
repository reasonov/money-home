import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation } from '@/shared'
import { useSessionStore } from '@/entities/session'
import { fetchCategories } from '../api/categoryApi'
import type { Category, CategoryKind } from './types'

export const useCategoryStore = defineStore('category', () => {
  const items = ref<Category[]>([])

  const expense = computed(() => items.value.filter((item) => item.kind === 'expense'))
  const income = computed(() => items.value.filter((item) => item.kind === 'income'))

  function upsert(category: Category) {
    const index = items.value.findIndex((item) => item.id === category.id)
    if (index === -1) {
      items.value = [...items.value, category]
      return
    }
    const next = [...items.value]
    next[index] = category
    items.value = next
  }

  function removeLocal(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function forAccount(accountId: string, kind?: CategoryKind) {
    return items.value.filter(
      (item) => item.accountIds.includes(accountId) && (kind == null || item.kind === kind),
    )
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  function hydrate(next: Category[]) {
    items.value = next
  }

  function bindAccounts(accountId: string, categoryIds: string[]) {
    const selected = new Set(categoryIds)
    items.value = items.value.map((cat) => {
      const has = cat.accountIds.includes(accountId)
      const want = selected.has(cat.id)
      if (has === want) {
        return cat
      }
      return {
        ...cat,
        accountIds: want
          ? [...cat.accountIds, accountId]
          : cat.accountIds.filter((id) => id !== accountId),
      }
    })
  }

  async function load() {
    items.value = await fetchCategories()
  }

  async function save(input: {
    id?: string
    kind: CategoryKind
    name: string
    color: string
    icon: string
    accountIds: string[]
  }) {
    assertWritable()
    const id = input.id ?? createUuid()
    const category: Category = {
      id,
      kind: input.kind,
      name: input.name,
      color: input.color,
      icon: input.icon,
      accountIds: input.accountIds,
    }
    upsert(category)
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error('Войдите в аккаунт')
    }
    await enqueueMutation(
      userId,
      'upsertCategory',
      { input: { ...input, id } },
      id,
    )
    return category
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

  function reset() {
    items.value = []
  }

  return {
    items,
    expense,
    income,
    upsert,
    removeLocal,
    forAccount,
    getById,
    hydrate,
    bindAccounts,
    load,
    save,
    remove,
    reset,
  }
})
