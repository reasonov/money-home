import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAccountStore } from '@/entities/account'
import { assertWritable, createUuid, enqueueMutation, roundMoney, todayLocal } from '@/shared'
import {
  fetchPurchases,
  mapPurchase,
} from '../api/purchaseApi'
import type { Purchase } from './types'

export const usePurchaseStore = defineStore('purchase', () => {
  const items = ref<Purchase[]>([])

  const planned = computed(() => items.value.filter((item) => item.status === 'planned'))

  const done = computed(() =>
    [...items.value]
      .filter((item) => item.status === 'done')
      .sort((a, b) => {
        if (!a.plannedDate && !b.plannedDate) {
          return 0
        }
        if (!a.plannedDate) {
          return 1
        }
        if (!b.plannedDate) {
          return -1
        }
        return b.plannedDate.localeCompare(a.plannedDate)
      }),
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

  function hydrate(next: Purchase[]) {
    items.value = next
  }

  function plannedFor(accountId: string) {
    return planned.value.filter((item) => item.accountId === accountId)
  }

  async function load() {
    items.value = await fetchPurchases()
  }

  async function addPurchase(input: {
    accountId: string
    categoryId: string
    categoryName: string
    categoryColor: string
    categoryIcon: string
    title: string
    amount: number
    plannedDate?: string
    notes?: string
    createdBy: string
  }) {
    assertWritable()
    const id = createUuid()
    const purchase: Purchase = {
      id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      categoryColor: input.categoryColor,
      categoryIcon: input.categoryIcon,
      title: input.title,
      amount: roundMoney(input.amount),
      status: 'planned',
      createdBy: input.createdBy,
      ...(input.plannedDate ? { plannedDate: input.plannedDate } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    }
    upsert(purchase)
    await enqueueMutation(input.createdBy, 'insertPurchase', { ...input, id }, id)
    return purchase
  }

  async function updatePurchase(
    id: string,
    userId: string,
    input: {
      accountId: string
      categoryId: string
      categoryName: string
      categoryColor: string
      categoryIcon: string
      title: string
      amount: number
      plannedDate?: string
      notes?: string
    },
  ) {
    assertWritable()
    const current = getById(id)
    if (!current || current.status !== 'planned') {
      throw new Error('Покупка уже проведена или отменена')
    }
    const purchase: Purchase = {
      ...current,
      ...input,
      amount: roundMoney(input.amount),
    }
    if (!input.plannedDate) {
      delete purchase.plannedDate
    }
    upsert(purchase)
    await enqueueMutation(userId, 'updatePurchase', { id, userId, input }, id)
    return purchase
  }

  async function setCancelled(id: string, userId: string) {
    assertWritable()
    const current = getById(id)
    if (!current || current.status !== 'planned') {
      throw new Error('Покупка уже проведена или отменена')
    }
    const purchase = { ...current, status: 'cancelled' as const }
    upsert(purchase)
    await enqueueMutation(userId, 'cancelPurchase', { id, userId }, id)
    return purchase
  }

  async function markDone(id: string) {
    assertWritable()
    const purchase = getById(id)
    if (!purchase || purchase.status !== 'planned') {
      throw new Error('Покупка уже проведена или отменена')
    }
    const next = { ...purchase, status: 'done' as const }
    upsert(next)
    const accounts = useAccountStore()
    const account = accounts.getById(purchase.accountId)
    if (account) {
      accounts.upsert({ ...account, amount: account.amount - purchase.amount })
    }
    const transactionId = createUuid()
    const { useTransactionStore } = await import('@/entities/transaction')
    useTransactionStore().upsert({
      id: transactionId,
      accountId: purchase.accountId,
      kind: 'expense',
      status: 'posted',
      source: 'purchase',
      amount: purchase.amount,
      occurredOn: purchase.plannedDate ?? todayLocal(),
      createdBy: purchase.createdBy,
      createdAt: new Date().toISOString(),
      title: purchase.title,
      ...(purchase.categoryId ? { categoryId: purchase.categoryId } : {}),
      ...(purchase.categoryName ? { categoryName: purchase.categoryName } : {}),
      ...(purchase.categoryColor ? { categoryColor: purchase.categoryColor } : {}),
      ...(purchase.categoryIcon ? { categoryIcon: purchase.categoryIcon } : {}),
      ...(purchase.notes ? { notes: purchase.notes } : {}),
    })
    await enqueueMutation(
      purchase.createdBy,
      'completePurchase',
      { id, transactionId },
      id,
    )
    return next
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  function reset() {
    items.value = []
  }

  return {
    items,
    planned,
    done,
    totalSpent,
    upsert,
    remove,
    applyRemoteRow,
    hydrate,
    plannedFor,
    load,
    addPurchase,
    updatePurchase,
    setCancelled,
    markDone,
    getById,
    reset,
  }
})
