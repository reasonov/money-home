import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation, todayLocal } from '@/shared'
import { fetchExpenseRules, mapExpenseRule } from '../api/expenseRuleApi'
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

  function hydrate(next: ExpenseRule[]) {
    items.value = next
  }

  function forAccount(accountId: string) {
    return items.value.filter((item) => item.accountId === accountId)
  }

  async function load() {
    items.value = await fetchExpenseRules()
  }

  async function addRule(userId: string, input: Omit<ExpenseRule, 'id'>) {
    assertWritable()
    const id = createUuid()
    const rule: ExpenseRule = { ...input, id, startsOn: input.startsOn ?? todayLocal() }
    upsert(rule)
    await enqueueMutation(userId, 'insertExpenseRule', { userId, input: { ...rule, id } }, id)
    return rule
  }

  async function updateRule(id: string, userId: string, patch: Partial<Omit<ExpenseRule, 'id'>>) {
    assertWritable()
    const current = items.value.find((item) => item.id === id)
    if (!current) {
      throw new Error('Правило не найдено')
    }
    const rule = { ...current, ...patch }
    upsert(rule)
    await enqueueMutation(userId, 'updateExpenseRule', { id, userId, patch }, id)
    return rule
  }

  async function removeRule(id: string, userId: string) {
    assertWritable()
    removeLocal(id)
    await enqueueMutation(userId, 'deleteExpenseRule', { id, userId }, id)
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
    hydrate,
    forAccount,
    load,
    addRule,
    updateRule,
    removeRule,
    reset,
  }
})
