import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { deleteCategory, fetchCategories, upsertCategory } from '../api/categoryApi'
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
    const category = await upsertCategory(input)
    upsert(category)
    return category
  }

  async function remove(id: string) {
    await deleteCategory(id)
    removeLocal(id)
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
    load,
    save,
    remove,
    reset,
  }
})
