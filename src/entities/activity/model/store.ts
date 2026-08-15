import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createId } from '@/shared'
import type { ActivityItem, ActivityKind } from './types'

const STORAGE_KEY = 'money-home.activity'
const SHOWN_PURCHASES_KEY = 'money-home.activity.shown-purchases'
const MAX_ITEMS = 50

function loadShownPurchaseIds(): string[] {
  try {
    const raw = sessionStorage.getItem(SHOWN_PURCHASES_KEY)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function loadItems(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as ActivityItem[]
  } catch {
    return []
  }
}

export const useActivityStore = defineStore('activity', () => {
  const items = ref<ActivityItem[]>(loadItems())

  const recent = computed(() =>
    [...items.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )

  const unseen = computed(() => recent.value.filter((item) => item.seenAt == null))

  const unseenCount = computed(() => unseen.value.length)

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  function push(input: {
    kind: ActivityKind
    actorId: string
    actorName: string
    summary: string
    purchaseId?: string
    transactionId?: string
    occurrenceId?: string
    createdAt?: string
    seenAt?: string | null
  }) {
    const item: ActivityItem = {
      id: createId('act'),
      kind: input.kind,
      actorId: input.actorId,
      actorName: input.actorName,
      summary: input.summary,
      createdAt: input.createdAt ?? new Date().toISOString(),
      seenAt: input.seenAt === undefined ? null : input.seenAt,
      ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      ...(input.occurrenceId ? { occurrenceId: input.occurrenceId } : {}),
    }
    items.value = [item, ...items.value].slice(0, MAX_ITEMS)
    persist()
    return item
  }

  function hasUnseenForPurchase(purchaseId: string) {
    return items.value.some(
      (item) => item.purchaseId === purchaseId && item.seenAt == null,
    )
  }

  function markPurchaseSeen(purchaseId: string) {
    const now = new Date().toISOString()
    let changed = false
    items.value = items.value.map((item) => {
      if (item.purchaseId !== purchaseId || item.seenAt != null) {
        return item
      }
      changed = true
      return { ...item, seenAt: now }
    })
    if (changed) {
      persist()
    }
  }

  function markAllSeen() {
    const now = new Date().toISOString()
    let changed = false
    items.value = items.value.map((item) => {
      if (item.seenAt != null) {
        return item
      }
      changed = true
      return { ...item, seenAt: now }
    })
    if (changed) {
      persist()
    }
  }

  function rememberShownPurchases(purchaseIds: string[]) {
    sessionStorage.setItem(SHOWN_PURCHASES_KEY, JSON.stringify([...new Set(purchaseIds)]))
  }

  function consumeShownPurchases() {
    const ids = loadShownPurchaseIds()
    sessionStorage.removeItem(SHOWN_PURCHASES_KEY)
    for (const id of ids) {
      markPurchaseSeen(id)
    }
  }

  function reset() {
    items.value = []
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SHOWN_PURCHASES_KEY)
  }

  return {
    items,
    recent,
    unseen,
    unseenCount,
    push,
    hasUnseenForPurchase,
    markPurchaseSeen,
    markAllSeen,
    rememberShownPurchases,
    consumeShownPurchases,
    reset,
  }
})
