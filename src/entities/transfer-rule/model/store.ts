import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation, todayLocal } from '@/shared'
import { fetchTransferRules, mapTransferRule } from '../api/transferRuleApi'
import type { TransferRule } from './types'

export const useTransferRuleStore = defineStore('transfer-rule', () => {
  const items = ref<TransferRule[]>([])

  const active = computed(() => items.value.filter((item) => item.active))

  function upsert(rule: TransferRule) {
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

  function applyRemoteRow(row: Parameters<typeof mapTransferRule>[0]) {
    upsert(mapTransferRule(row))
  }

  function hydrate(next: TransferRule[]) {
    items.value = next
  }

  function forAccount(accountId: string) {
    return items.value.filter(
      (item) => item.fromAccountId === accountId || item.toAccountId === accountId,
    )
  }

  function incomingFor(accountId: string) {
    return items.value.filter((item) => item.toAccountId === accountId)
  }

  function outgoingFor(accountId: string) {
    return items.value.filter((item) => item.fromAccountId === accountId)
  }

  async function load() {
    items.value = await fetchTransferRules()
  }

  async function addRule(userId: string, input: Omit<TransferRule, 'id'>) {
    assertWritable()
    const id = createUuid()
    const rule: TransferRule = { ...input, id, startsOn: input.startsOn ?? todayLocal() }
    upsert(rule)
    await enqueueMutation(userId, 'insertTransferRule', { userId, input: { ...rule, id } }, id)
    return rule
  }

  async function updateRule(id: string, userId: string, patch: Partial<Omit<TransferRule, 'id'>>) {
    assertWritable()
    const current = items.value.find((item) => item.id === id)
    if (!current) {
      throw new Error('Правило не найдено')
    }
    const rule = { ...current, ...patch }
    upsert(rule)
    await enqueueMutation(userId, 'updateTransferRule', { id, userId, patch }, id)
    return rule
  }

  async function removeRule(id: string, userId: string) {
    assertWritable()
    removeLocal(id)
    await enqueueMutation(userId, 'deleteTransferRule', { id, userId }, id)
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
    incomingFor,
    outgoingFor,
    load,
    addRule,
    updateRule,
    removeRule,
    reset,
  }
})
