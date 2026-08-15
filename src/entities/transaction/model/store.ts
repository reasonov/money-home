import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAccountStore } from '@/entities/account'
import {
  adjustIncomeOccurrence,
  applyDueIncomeRules,
  cancelPostedTransaction,
  fetchOccurrences,
  fetchTransactions,
  insertTransaction,
  mapTransaction,
  skipIncomeOccurrence,
  updatePostedTransaction,
  type OccurrenceRow,
} from '../api/transactionApi'
import type { Transaction } from './types'

export const useTransactionStore = defineStore('transaction', () => {
  const items = ref<Transaction[]>([])
  const occurrences = ref<OccurrenceRow[]>([])

  const posted = computed(() =>
    items.value
      .filter((item) => item.status === 'posted')
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
  )

  function upsert(tx: Transaction) {
    const index = items.value.findIndex((item) => item.id === tx.id)
    if (index === -1) {
      items.value = [...items.value, tx]
      return
    }
    const next = [...items.value]
    next[index] = tx
    items.value = next
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function applyRemoteRow(row: Parameters<typeof mapTransaction>[0]) {
    upsert(mapTransaction(row))
  }

  function occurrenceDatesFor(ruleId: string) {
    return occurrences.value
      .filter((item) => item.income_rule_id === ruleId)
      .map((item) => item.occurred_on)
  }

  function occurrenceByTransaction(transactionId: string) {
    return occurrences.value.find((item) => item.transaction_id === transactionId)
  }

  async function load() {
    const [txs, occ] = await Promise.all([fetchTransactions(), fetchOccurrences()])
    items.value = txs
    occurrences.value = occ
  }

  async function addManual(input: {
    accountId: string
    kind: 'expense' | 'income'
    categoryId?: string
    categoryName?: string
    categoryColor?: string
    categoryIcon?: string
    title?: string
    amount: number
    occurredOn: string
    notes?: string
    createdBy: string
  }) {
    const tx = await insertTransaction(input)
    upsert(tx)
    return tx
  }

  async function applyDue(asOf: string) {
    const postedTx = await applyDueIncomeRules(asOf)
    for (const tx of postedTx) {
      upsert(tx)
    }
    if (postedTx.length) {
      occurrences.value = await fetchOccurrences()
      await useAccountStore().load()
    }
    return postedTx
  }

  async function skipOccurrence(occurrenceId: string) {
    await skipIncomeOccurrence(occurrenceId)
    await Promise.all([load(), useAccountStore().load()])
  }

  async function adjustOccurrence(occurrenceId: string, amount: number) {
    const tx = await adjustIncomeOccurrence(occurrenceId, amount)
    upsert(tx)
    await useAccountStore().load()
    return tx
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  async function updatePosted(input: {
    id: string
    accountId: string
    amount: number
    occurredOn: string
    counterpartyAccountId?: string
    categoryId?: string
    title?: string
    notes?: string
  }) {
    const tx = await updatePostedTransaction(input)
    upsert(tx)
    if (tx.source === 'income_rule') {
      occurrences.value = await fetchOccurrences()
    }
    await useAccountStore().load()
    return tx
  }

  async function cancelPosted(id: string) {
    await cancelPostedTransaction(id)
    await Promise.all([load(), useAccountStore().load()])
  }

  function reset() {
    items.value = []
    occurrences.value = []
  }

  return {
    items,
    occurrences,
    posted,
    upsert,
    remove,
    applyRemoteRow,
    occurrenceDatesFor,
    occurrenceByTransaction,
    getById,
    load,
    addManual,
    updatePosted,
    cancelPosted,
    applyDue,
    skipOccurrence,
    adjustOccurrence,
    reset,
  }
})
