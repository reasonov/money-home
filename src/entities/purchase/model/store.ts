import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useBalanceStore } from '@/entities/balance'
import {
  cancelPurchase,
  completePurchase,
  fetchPurchases,
  insertPurchase,
  mapPurchase,
  updatePurchaseRow,
} from '../api/purchaseApi'
import type { Purchase } from './types'

export const usePurchaseStore = defineStore('purchase', () => {
  const items = ref<Purchase[]>([])
  const householdId = ref<string | null>(null)

  const planned = computed(() => items.value.filter((item) => item.status === 'planned'))

  const done = computed(() =>
    [...items.value]
      .filter((item) => item.status === 'done')
      .sort((a, b) => b.plannedDate.localeCompare(a.plannedDate)),
  )

  const totalSpent = computed(() => done.value.reduce((sum, item) => sum + item.amount, 0))

  function upsert(purchase: Purchase) {
    const index = items.value.findIndex((item) => item.id === purchase.id)
    if (index === -1) {
      items.value = [...items.value, purchase]
      return
    }
    const next = [...items.value]
    next[index] = purchase
    items.value = next
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function applyRemoteRow(row: Parameters<typeof mapPurchase>[0]) {
    upsert(mapPurchase(row))
  }

  async function load(nextHouseholdId: string) {
    householdId.value = nextHouseholdId
    items.value = await fetchPurchases(nextHouseholdId)
  }

  async function addPurchase(input: {
    title: string
    amount: number
    plannedDate: string
    notes?: string
    createdBy: string
  }) {
    if (!householdId.value) {
      throw new Error('Семья не загружена')
    }
    const purchase = await insertPurchase({
      householdId: householdId.value,
      ...input,
    })
    upsert(purchase)
    return purchase
  }

  async function updatePurchase(
    id: string,
    userId: string,
    input: {
      title: string
      amount: number
      plannedDate: string
      notes?: string
    },
  ) {
    const purchase = await updatePurchaseRow(id, userId, input)
    upsert(purchase)
    return purchase
  }

  async function setCancelled(id: string, userId: string) {
    const purchase = await cancelPurchase(id, userId)
    upsert(purchase)
    return purchase
  }

  async function markDone(id: string) {
    const purchase = await completePurchase(id)
    upsert(purchase)
    const balance = useBalanceStore()
    balance.applyRemote(balance.amount - purchase.amount)
    return purchase
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  function reset() {
    items.value = []
    householdId.value = null
  }

  return {
    items,
    householdId,
    planned,
    done,
    totalSpent,
    upsert,
    remove,
    applyRemoteRow,
    load,
    addPurchase,
    updatePurchase,
    setCancelled,
    markDone,
    getById,
    reset,
  }
})
