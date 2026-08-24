import { useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import { createUuid, dueKey, parseLocalDate, ruleDueDates, todayLocal } from '@/shared'
import {
  addLocalOnlyId,
  clearLocalOnlyIds,
  getLocalOnlyIds,
  getSkippedDueKeys,
} from '@/shared/lib/offlineMeta'

function clearDueSimulation(): void {
  const transactions = useTransactionStore()
  const accounts = useAccountStore()
  const ids = Array.from(getLocalOnlyIds())
  for (const id of ids) {
    const tx = transactions.getById(id)
    if (tx?.status === 'posted') {
      if (tx.kind === 'transfer') {
        accounts.applyAmountDelta(tx.accountId, tx.amount)
        if (tx.counterpartyAccountId) {
          accounts.applyAmountDelta(tx.counterpartyAccountId, -tx.amount)
        }
      } else {
        const delta = tx.kind === 'income' ? -tx.amount : tx.amount
        accounts.applyAmountDelta(tx.accountId, delta)
      }
    }
    transactions.remove(id)
    transactions.removeOccurrence(id)
  }
  clearLocalOnlyIds()
}

export function applyDueSimulation(): void {
  clearDueSimulation()
  const asOf = todayLocal()
  const asOfDate = parseLocalDate(asOf)
  const transactions = useTransactionStore()
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  const session = useSessionStore()
  const userId = session.user?.id
  if (!userId) {
    return
  }

  for (const rule of useIncomeRuleStore().active) {
    if (!rule.startsOn) {
      continue
    }
    const posted = new Set(transactions.occurrenceDatesFor(rule.id))
    for (const iso of ruleDueDates(rule, parseLocalDate(rule.startsOn), asOfDate)) {
      if (posted.has(iso) || getSkippedDueKeys().has(dueKey('income', rule.id, iso))) {
        continue
      }
      const txId = createUuid()
      const occId = createUuid()
      const category = rule.categoryId ? categories.getById(rule.categoryId) : undefined
      transactions.upsert({
        id: txId,
        accountId: rule.accountId,
        kind: 'income',
        status: 'posted',
        source: 'income_rule',
        amount: rule.amount,
        occurredOn: iso,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        ...(rule.title ? { title: rule.title } : { title: 'Авто-пополнение' }),
        ...(category
          ? {
              categoryId: category.id,
              categoryName: category.name,
              categoryColor: category.color,
              categoryIcon: category.icon,
            }
          : {}),
      })
      transactions.upsertIncomeOccurrence({
        id: occId,
        income_rule_id: rule.id,
        occurred_on: iso,
        status: 'posted',
        transaction_id: txId,
      })
      accounts.applyAmountDelta(rule.accountId, rule.amount)
      addLocalOnlyId(txId)
      addLocalOnlyId(occId)
    }
  }

  for (const rule of useExpenseRuleStore().active) {
    if (!rule.startsOn) {
      continue
    }
    const posted = new Set(transactions.expenseOccurrenceDatesFor(rule.id))
    for (const iso of ruleDueDates(rule, parseLocalDate(rule.startsOn), asOfDate)) {
      if (posted.has(iso) || getSkippedDueKeys().has(dueKey('expense', rule.id, iso))) {
        continue
      }
      const txId = createUuid()
      const occId = createUuid()
      const category = rule.categoryId ? categories.getById(rule.categoryId) : undefined
      transactions.upsert({
        id: txId,
        accountId: rule.accountId,
        kind: 'expense',
        status: 'posted',
        source: 'expense_rule',
        amount: rule.amount,
        occurredOn: iso,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        ...(rule.title ? { title: rule.title } : { title: 'Регулярный расход' }),
        ...(category
          ? {
              categoryId: category.id,
              categoryName: category.name,
              categoryColor: category.color,
              categoryIcon: category.icon,
            }
          : {}),
      })
      transactions.upsertExpenseOccurrence({
        id: occId,
        expense_rule_id: rule.id,
        occurred_on: iso,
        status: 'posted',
        transaction_id: txId,
      })
      accounts.applyAmountDelta(rule.accountId, -rule.amount)
      addLocalOnlyId(txId)
      addLocalOnlyId(occId)
    }
  }

  for (const rule of useTransferRuleStore().active) {
    if (!rule.startsOn) {
      continue
    }
    const posted = new Set(transactions.transferOccurrenceDatesFor(rule.id))
    for (const iso of ruleDueDates(rule, parseLocalDate(rule.startsOn), asOfDate)) {
      if (posted.has(iso) || getSkippedDueKeys().has(dueKey('transfer', rule.id, iso))) {
        continue
      }
      const txId = createUuid()
      const occId = createUuid()
      transactions.upsert({
        id: txId,
        accountId: rule.fromAccountId,
        counterpartyAccountId: rule.toAccountId,
        kind: 'transfer',
        status: 'posted',
        source: 'transfer_rule',
        amount: rule.amount,
        occurredOn: iso,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        ...(rule.title ? { title: rule.title } : { title: 'Перевод' }),
      })
      transactions.upsertTransferOccurrence({
        id: occId,
        transfer_rule_id: rule.id,
        occurred_on: iso,
        status: 'posted',
        transaction_id: txId,
      })
      accounts.applyAmountDelta(rule.fromAccountId, -rule.amount)
      accounts.applyAmountDelta(rule.toAccountId, rule.amount)
      addLocalOnlyId(txId)
      addLocalOnlyId(occId)
    }
  }
}
