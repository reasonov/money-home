import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAccountStore } from '@/entities/account'
import {
  adjustExpenseOccurrence,
  adjustIncomeOccurrence,
  applyDueExpenseRules,
  applyDueIncomeRules,
  cancelPostedTransaction,
  fetchExpenseOccurrences,
  fetchOccurrences,
  fetchTransactions,
  insertTransaction,
  mapTransaction,
  skipExpenseOccurrence,
  skipIncomeOccurrence,
  updatePostedTransaction,
  type ExpenseOccurrenceRow,
  type OccurrenceRow,
} from '../api/transactionApi'
import type { Transaction } from './types'

export const useTransactionStore = defineStore('transaction', () => {
  const items = ref<Transaction[]>([])
  const occurrences = ref<OccurrenceRow[]>([])
  const expenseOccurrences = ref<ExpenseOccurrenceRow[]>([])

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

  function expenseOccurrenceDatesFor(ruleId: string) {
    return expenseOccurrences.value
      .filter((item) => item.expense_rule_id === ruleId)
      .map((item) => item.occurred_on)
  }

  function occurrenceByTransaction(transactionId: string) {
    return (
      occurrences.value.find((item) => item.transaction_id === transactionId) ??
      expenseOccurrences.value.find((item) => item.transaction_id === transactionId)
    )
  }

  async function reloadOccurrences() {
    const [incomeOcc, expenseOcc] = await Promise.all([
      fetchOccurrences(),
      fetchExpenseOccurrences(),
    ])
    occurrences.value = incomeOcc
    expenseOccurrences.value = expenseOcc
  }

  async function load() {
    const [txs] = await Promise.all([fetchTransactions(), reloadOccurrences()])
    items.value = txs
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
    const [incomePosted, expensePosted] = await Promise.all([
      applyDueIncomeRules(asOf),
      applyDueExpenseRules(asOf),
    ])
    const postedTx = [...incomePosted, ...expensePosted]
    for (const tx of postedTx) {
      upsert(tx)
    }
    if (postedTx.length) {
      await reloadOccurrences()
      await useAccountStore().load()
    }
    return postedTx
  }

  async function skipOccurrence(occurrenceId: string) {
    if (occurrences.value.some((item) => item.id === occurrenceId)) {
      await skipIncomeOccurrence(occurrenceId)
    } else {
      await skipExpenseOccurrence(occurrenceId)
    }
    await Promise.all([load(), useAccountStore().load()])
  }

  async function adjustOccurrence(occurrenceId: string, amount: number) {
    const tx = occurrences.value.some((item) => item.id === occurrenceId)
      ? await adjustIncomeOccurrence(occurrenceId, amount)
      : await adjustExpenseOccurrence(occurrenceId, amount)
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
    if (tx.source === 'income_rule' || tx.source === 'expense_rule') {
      await reloadOccurrences()
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
    expenseOccurrences.value = []
  }

  return {
    items,
    occurrences,
    expenseOccurrences,
    posted,
    upsert,
    remove,
    applyRemoteRow,
    occurrenceDatesFor,
    expenseOccurrenceDatesFor,
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
