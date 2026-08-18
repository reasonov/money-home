import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAccountStore } from '@/entities/account'
import { dueKey } from '@/shared'
import { rememberSkippedDue, isLocalOnlyId } from '@/shared/lib/offlineMeta'
import {
  applyDueExpenseRules,
  applyDueIncomeRules,
  fetchExpenseOccurrences,
  fetchOccurrences,
  fetchTransactions,
  mapTransaction,
  type ExpenseOccurrenceRow,
  type OccurrenceRow,
} from '../api/transactionApi'
import type { Transaction } from './types'
import { assertWritable, createUuid, enqueueMutation } from '@/shared'

export const useTransactionStore = defineStore('transaction', () => {
  const items = ref<Transaction[]>([])
  const occurrences = ref<OccurrenceRow[]>([])
  const expenseOccurrences = ref<ExpenseOccurrenceRow[]>([])

  const posted = computed(() =>
    items.value
      .filter((item) => item.status === 'posted')
      .sort(
        (a, b) =>
          b.occurredOn.localeCompare(a.occurredOn) ||
          (b.createdAt ?? '').localeCompare(a.createdAt ?? '') ||
          b.id.localeCompare(a.id),
      ),
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

  function hydrate(
    txs: Transaction[],
    incomeOcc: OccurrenceRow[],
    expenseOcc: ExpenseOccurrenceRow[],
  ) {
    items.value = txs
    occurrences.value = incomeOcc
    expenseOccurrences.value = expenseOcc
  }

  function upsertIncomeOccurrence(row: OccurrenceRow) {
    const index = occurrences.value.findIndex((item) => item.id === row.id)
    if (index === -1) {
      occurrences.value = [...occurrences.value, row]
      return
    }
    const next = [...occurrences.value]
    next[index] = row
    occurrences.value = next
  }

  function upsertExpenseOccurrence(row: ExpenseOccurrenceRow) {
    const index = expenseOccurrences.value.findIndex((item) => item.id === row.id)
    if (index === -1) {
      expenseOccurrences.value = [...expenseOccurrences.value, row]
      return
    }
    const next = [...expenseOccurrences.value]
    next[index] = row
    expenseOccurrences.value = next
  }

  function removeOccurrence(id: string) {
    occurrences.value = occurrences.value.filter((item) => item.id !== id && item.transaction_id !== id)
    expenseOccurrences.value = expenseOccurrences.value.filter(
      (item) => item.id !== id && item.transaction_id !== id,
    )
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

  function postedBalanceDelta(tx: Transaction, multiplier: 1 | -1) {
    if (tx.kind === 'income') {
      return tx.amount * multiplier
    }
    if (tx.kind === 'expense') {
      return -tx.amount * multiplier
    }
    if (tx.kind === 'transfer') {
      useAccountStore().applyAmountDelta(tx.accountId, -tx.amount * multiplier)
      if (tx.counterpartyAccountId) {
        useAccountStore().applyAmountDelta(tx.counterpartyAccountId, tx.amount * multiplier)
      }
      return 0
    }
    return 0
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
    assertWritable()
    const id = createUuid()
    const amount = Math.round(input.amount)
    const tx: Transaction = {
      id,
      accountId: input.accountId,
      kind: input.kind,
      status: 'posted',
      source: 'manual',
      amount,
      occurredOn: input.occurredOn,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.categoryName ? { categoryName: input.categoryName } : {}),
      ...(input.categoryColor ? { categoryColor: input.categoryColor } : {}),
      ...(input.categoryIcon ? { categoryIcon: input.categoryIcon } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    }
    upsert(tx)
    useAccountStore().applyAmountDelta(input.accountId, input.kind === 'income' ? amount : -amount)
    await enqueueMutation(input.createdBy, 'insertTransaction', { ...input, id, amount }, id)
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
    assertWritable()
    const income = occurrences.value.find((item) => item.id === occurrenceId)
    const expense = expenseOccurrences.value.find((item) => item.id === occurrenceId)
    const occ = income ?? expense
    if (!occ) {
      return
    }
    const tx = occ.transaction_id ? getById(occ.transaction_id) : undefined
    if (tx && tx.status === 'posted') {
      upsert({ ...tx, status: 'cancelled' })
      useAccountStore().applyAmountDelta(tx.accountId, postedBalanceDelta(tx, -1))
    }
    if (income) {
      upsertIncomeOccurrence({ ...income, status: 'skipped' })
    } else if (expense) {
      upsertExpenseOccurrence({ ...expense, status: 'skipped' })
    }

    const userId = tx?.createdBy
    const local = isLocalOnlyId(occurrenceId) || (occ.transaction_id ? isLocalOnlyId(occ.transaction_id) : false)
    if (local && userId) {
      const kind = income ? 'income' : 'expense'
      const ruleId = income ? income.income_rule_id : expense!.expense_rule_id
      rememberSkippedDue(dueKey(kind, ruleId, occ.occurred_on))
      await enqueueMutation(
        userId,
        kind === 'income' ? 'skipDueIncome' : 'skipDueExpense',
        { ruleId, occurredOn: occ.occurred_on },
        occurrenceId,
      )
      return
    }
    if (userId) {
      await enqueueMutation(
        userId,
        income ? 'skipIncomeOccurrence' : 'skipExpenseOccurrence',
        { id: occurrenceId },
        occurrenceId,
      )
    }
  }

  async function adjustOccurrence(occurrenceId: string, amount: number) {
    assertWritable()
    const value = Math.round(amount)
    const income = occurrences.value.find((item) => item.id === occurrenceId)
    const expense = expenseOccurrences.value.find((item) => item.id === occurrenceId)
    const occ = income ?? expense
    const tx = occ?.transaction_id ? getById(occ.transaction_id) : undefined
    if (!occ || !tx) {
      return
    }
    const delta = value - tx.amount
    upsert({ ...tx, amount: value })
    useAccountStore().applyAmountDelta(tx.accountId, tx.kind === 'income' ? delta : -delta)
    if (income) {
      upsertIncomeOccurrence({ ...income, status: 'adjusted' })
    } else if (expense) {
      upsertExpenseOccurrence({ ...expense, status: 'adjusted' })
    }

    const local = isLocalOnlyId(occurrenceId) || isLocalOnlyId(tx.id)
    if (local) {
      const kind = income ? 'income' : 'expense'
      const ruleId = income ? income.income_rule_id : expense!.expense_rule_id
      await enqueueMutation(
        tx.createdBy,
        kind === 'income' ? 'adjustDueIncome' : 'adjustDueExpense',
        { ruleId, occurredOn: occ.occurred_on, amount: value },
        occurrenceId,
      )
      return tx
    }
    await enqueueMutation(
      tx.createdBy,
      income ? 'adjustIncomeOccurrence' : 'adjustExpenseOccurrence',
      { id: occurrenceId, amount: value },
      occurrenceId,
    )
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
    assertWritable()
    const current = getById(input.id)
    if (!current || current.status !== 'posted') {
      throw new Error('Операция не найдена')
    }
    useAccountStore().applyAmountDelta(current.accountId, postedBalanceDelta(current, -1))
    const next: Transaction = {
      ...current,
      accountId: input.accountId,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      ...(input.counterpartyAccountId
        ? { counterpartyAccountId: input.counterpartyAccountId }
        : { counterpartyAccountId: undefined }),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.notes != null ? { notes: input.notes } : {}),
    }
    upsert(next)
    useAccountStore().applyAmountDelta(next.accountId, postedBalanceDelta(next, 1))
    await enqueueMutation(current.createdBy, 'updatePostedTransaction', { ...input }, input.id)
    return next
  }

  async function cancelPosted(id: string) {
    assertWritable()
    const current = getById(id)
    if (!current || current.status !== 'posted') {
      return
    }
    upsert({ ...current, status: 'cancelled' })
    useAccountStore().applyAmountDelta(current.accountId, postedBalanceDelta(current, -1))
    await enqueueMutation(current.createdBy, 'cancelPostedTransaction', { id }, id)
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
    hydrate,
    upsertIncomeOccurrence,
    upsertExpenseOccurrence,
    removeOccurrence,
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
