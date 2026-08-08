import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteIncomeRule,
  fetchIncomeRules,
  insertIncomeRule,
  mapIncomeRule,
  updateIncomeRule,
} from '../api/incomeRuleApi'
import type { IncomeRule } from './types'

export const useIncomeRuleStore = defineStore('income-rule', () => {
  const items = ref<IncomeRule[]>([])
  const householdId = ref<string | null>(null)

  const active = computed(() => items.value.filter((item) => item.active))

  function upsert(rule: IncomeRule) {
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

  function applyRemoteRow(row: Parameters<typeof mapIncomeRule>[0]) {
    upsert(mapIncomeRule(row))
  }

  async function load(nextHouseholdId: string) {
    householdId.value = nextHouseholdId
    items.value = await fetchIncomeRules(nextHouseholdId)
  }

  async function addRule(userId: string, input: Omit<IncomeRule, 'id'>) {
    if (!householdId.value) {
      throw new Error('Семья не загружена')
    }
    const rule = await insertIncomeRule(householdId.value, userId, input)
    upsert(rule)
    return rule
  }

  async function updateRule(id: string, userId: string, patch: Partial<Omit<IncomeRule, 'id'>>) {
    const rule = await updateIncomeRule(id, userId, patch)
    upsert(rule)
    return rule
  }

  async function removeRule(id: string, userId: string) {
    await deleteIncomeRule(id, userId)
    removeLocal(id)
  }

  function reset() {
    items.value = []
    householdId.value = null
  }

  return {
    items,
    householdId,
    active,
    upsert,
    removeLocal,
    applyRemoteRow,
    load,
    addRule,
    updateRule,
    removeRule,
    reset,
  }
})
