import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation, todayLocal } from '@/shared'
import { fetchIncomeRules, mapIncomeRule } from '../api/incomeRuleApi'
import type { IncomeRule } from './types'

export const useIncomeRuleStore = defineStore('income-rule', () => {
  const items = ref<IncomeRule[]>([])

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

  function hydrate(next: IncomeRule[]) {
    items.value = next
  }

  function forAccount(accountId: string) {
    return items.value.filter((item) => item.accountId === accountId)
  }

  async function load() {
    items.value = await fetchIncomeRules()
  }

  async function addRule(userId: string, input: Omit<IncomeRule, 'id'>) {
    assertWritable()
    const id = createUuid()
    const rule: IncomeRule = { ...input, id, startsOn: input.startsOn ?? todayLocal() }
    upsert(rule)
    await enqueueMutation(userId, 'insertIncomeRule', { userId, input: { ...rule, id } }, id)
    return rule
  }

  async function updateRule(id: string, userId: string, patch: Partial<Omit<IncomeRule, 'id'>>) {
    assertWritable()
    const current = items.value.find((item) => item.id === id)
    if (!current) {
      throw new Error('Правило не найдено')
    }
    const rule = { ...current, ...patch }
    upsert(rule)
    await enqueueMutation(userId, 'updateIncomeRule', { id, userId, patch }, id)
    return rule
  }

  async function removeRule(id: string, userId: string) {
    assertWritable()
    removeLocal(id)
    await enqueueMutation(userId, 'deleteIncomeRule', { id, userId }, id)
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
