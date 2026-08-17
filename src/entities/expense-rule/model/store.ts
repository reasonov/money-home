import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteExpenseRule,
  fetchExpenseRules,
  insertExpenseRule,
  mapExpenseRule,
  updateExpenseRule,
} from '../api/expenseRuleApi'
import type { ExpenseRule } from './types'

export const useExpenseRuleStore = defineStore('expense-rule', () => {
  const items = ref<ExpenseRule[]>([])

  const active = computed(() => items.value.filter((item) => item.active))

  function upsert(rule: ExpenseRule) {
    const index = items.value.findIndex((item) => item.id === rule.id)
    if (index === -1) {
      items.value = [...items.value, rule]
      return
    }
    const next = [...items.value]
    next[index] = rule
    items.value = next
  }

  function removeLocal(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function applyRemoteRow(row: Parameters<typeof mapExpenseRule>[0]) {
    upsert(mapExpenseRule(row))
  }

  function forAccount(accountId: string) {
    return items.value.filter((item) => item.accountId === accountId)
  }

  async function load() {
    items.value = await fetchExpenseRules()
  }

  async function addRule(userId: string, input: Omit<ExpenseRule, 'id'>) {
    const rule = await insertExpenseRule(userId, input)
    upsert(rule)
    return rule
  }

  async function updateRule(id: string, userId: string, patch: Partial<Omit<ExpenseRule, 'id'>>) {
    const rule = await updateExpenseRule(id, userId, patch)
    upsert(rule)
    return rule
  }

  async function removeRule(id: string, userId: string) {
    await deleteExpenseRule(id, userId)
    removeLocal(id)
  }

  function reset() {
    items.value = []
  }

  return {
    items,
    active,
    upsert,
    removeLocal,
    applyRemoteRow,
    forAccount,
    load,
    addRule,
    updateRule,
    removeRule,
    reset,
  }
})
