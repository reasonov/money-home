import type { RealtimeChannel } from '@supabase/supabase-js'
import { addDays, formatLocalDate, formatMoney, parseLocalDate, supabase, todayLocal } from '@/shared'
import { useActivityStore } from '@/entities/activity'
import { useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import { ensureProfile } from '../api/accountApi'
import { useAccountStore } from '../model/store'

let channel: RealtimeChannel | null = null

function formatAmount(value: unknown) {
  return formatMoney(Math.round(Number(value)))
}

export async function loadAccountData() {
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transactions = useTransactionStore()

  await Promise.all([
    accounts.load(),
    categories.load(),
    purchases.load(),
    incomeRules.load(),
    expenseRules.load(),
    transactions.load(),
  ])
}

export function stopAccountRealtime() {
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

export function startAccountRealtime() {
  stopAccountRealtime()

  const session = useSessionStore()
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transactions = useTransactionStore()
  const activity = useActivityStore()

  channel = supabase
    .channel('user-accounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
      const eventType = payload.eventType
      const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
        id: string
        name: string
        amount: number
        owner_id: string
        invite_code: string | null
        updated_by?: string | null
      } | null
      if (!row?.id) return
      if (eventType === 'DELETE') {
        accounts.remove(row.id)
        return
      }
      accounts.applyRemoteRow(row)
      const actorId = row.updated_by
      if (!actorId || actorId === session.user?.id) return
      activity.push({
        kind: 'account_updated',
        actorId,
        actorName: accounts.memberName(actorId),
        summary: `${accounts.memberName(actorId)} обновил(а) счёт «${row.name}»: ${formatAmount(row.amount)}`,
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'account_members' }, () => {
      void accounts.load()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
      void categories.load()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'category_accounts' }, () => {
      void categories.load()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, (payload) => {
      const eventType = payload.eventType
      const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
        id: string
        account_id: string
        category_id: string | null
        category_name: string | null
        category_color: string | null
        category_icon: string | null
        title: string
        amount: number
        planned_date: string
        notes: string | null
        status: string
        created_by: string
        updated_by?: string | null
      } | null
      if (!row) return
      if (eventType === 'DELETE') {
        purchases.remove(row.id)
        return
      }
      purchases.applyRemoteRow(row)
      const actorId = eventType === 'INSERT' ? row.created_by : (row.updated_by ?? row.created_by)
      if (!actorId || actorId === session.user?.id) return
      const actorName = accounts.memberName(actorId)
      if (eventType === 'INSERT') {
        activity.push({
          kind: 'purchase_created',
          actorId,
          actorName,
          purchaseId: row.id,
          summary: `${actorName} добавил(а) покупку «${row.title}» на ${formatAmount(row.amount)}`,
        })
        return
      }
      if (row.status === 'done') {
        activity.push({
          kind: 'purchase_done',
          actorId,
          actorName,
          purchaseId: row.id,
          summary: `${actorName} отметил(а) «${row.title}» готовым`,
        })
        return
      }
      if (row.status === 'cancelled') {
        activity.push({
          kind: 'purchase_cancelled',
          actorId,
          actorName,
          purchaseId: row.id,
          summary: `${actorName} отменил(а) покупку «${row.title}»`,
        })
        return
      }
      activity.push({
        kind: 'purchase_updated',
        actorId,
        actorName,
        purchaseId: row.id,
        summary: `${actorName} изменил(а) покупку «${row.title}»`,
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'income_rules' }, (payload) => {
      const eventType = payload.eventType
      const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
        id: string
        account_id: string
        amount: number
        frequency: string
        weekday: number | null
        month_day: number | null
        anchor_date: string | null
        title: string | null
        category_id: string | null
        active: boolean
        updated_by?: string | null
      } | null
      if (!row) return
      if (eventType === 'DELETE') {
        incomeRules.removeLocal(row.id)
      } else {
        incomeRules.applyRemoteRow(row)
      }
      const actorId = row.updated_by
      if (!actorId || actorId === session.user?.id) return
      const actorName = accounts.memberName(actorId)
      activity.push({
        kind: 'income_rule_changed',
        actorId,
        actorName,
        summary:
          eventType === 'DELETE'
            ? `${actorName} удалил(а) правило пополнения`
            : `${actorName} изменил(а) правила пополнения`,
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_rules' }, (payload) => {
      const eventType = payload.eventType
      const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
        id: string
        account_id: string
        amount: number
        frequency: string
        weekday: number | null
        month_day: number | null
        anchor_date: string | null
        title: string | null
        category_id: string | null
        active: boolean
        updated_by?: string | null
      } | null
      if (!row) return
      if (eventType === 'DELETE') {
        expenseRules.removeLocal(row.id)
      } else {
        expenseRules.applyRemoteRow(row)
      }
      const actorId = row.updated_by
      if (!actorId || actorId === session.user?.id) return
      const actorName = accounts.memberName(actorId)
      activity.push({
        kind: 'expense_rule_changed',
        actorId,
        actorName,
        summary:
          eventType === 'DELETE'
            ? `${actorName} удалил(а) правило расхода`
            : `${actorName} изменил(а) регулярные расходы`,
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
      const eventType = payload.eventType
      const row = (eventType === 'DELETE' ? payload.old : payload.new) as {
        id: string
        account_id: string
        counterparty_account_id: string | null
        kind: string
        status: string
        source: string
        category_id: string | null
        category_name: string | null
        category_color: string | null
        category_icon: string | null
        title: string | null
        amount: number
        occurred_on: string
        notes: string | null
        created_by: string
      } | null
      if (!row) return
      if (eventType === 'DELETE') {
        transactions.remove(row.id)
        return
      }
      transactions.applyRemoteRow(row)
      const actorId = row.created_by
      if (!actorId) return
      const actorName = accounts.memberName(actorId)
      const label = row.title?.trim() || row.category_name || 'Операция'
      if (row.source === 'income_rule' && eventType === 'INSERT' && row.status === 'posted') {
        if (actorId === session.user?.id) return
        void transactions.load().then(() => {
          activity.push({
            kind: 'income_auto_posted',
            actorId,
            actorName,
            transactionId: row.id,
            occurrenceId: transactions.occurrenceByTransaction(row.id)?.id,
            summary: `На счёт зачислено ${formatAmount(row.amount)} — ${label}`,
          })
        })
        return
      }
      if (row.source === 'expense_rule' && eventType === 'INSERT' && row.status === 'posted') {
        if (actorId === session.user?.id) return
        void transactions.load().then(() => {
          activity.push({
            kind: 'expense_auto_posted',
            actorId,
            actorName,
            transactionId: row.id,
            occurrenceId: transactions.occurrenceByTransaction(row.id)?.id,
            summary: `Со счёта списано ${formatAmount(row.amount)} — ${label}`,
          })
        })
        return
      }
      if (actorId === session.user?.id) return
      if (eventType === 'INSERT' && row.status === 'posted') {
        activity.push({
          kind: 'transaction_created',
          actorId,
          actorName,
          transactionId: row.id,
          summary: `${actorName} добавил(а) ${row.kind === 'income' ? 'доход' : row.kind === 'transfer' ? 'перевод' : 'расход'} «${label}» на ${formatAmount(row.amount)}`,
        })
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'income_occurrences' }, () => {
      void transactions.load()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_occurrences' }, () => {
      void transactions.load()
    })
    .subscribe()
}

function notifyRecentAutoRules() {
  const transactions = useTransactionStore()
  const activity = useActivityStore()
  const knownIncome = new Set(
    activity.items
      .filter((item) => item.kind === 'income_auto_posted' && item.transactionId)
      .map((item) => item.transactionId),
  )
  const knownExpense = new Set(
    activity.items
      .filter((item) => item.kind === 'expense_auto_posted' && item.transactionId)
      .map((item) => item.transactionId),
  )
  const cutoff = formatLocalDate(addDays(parseLocalDate(todayLocal()), -14))
  for (const tx of transactions.posted) {
    if (tx.occurredOn < cutoff) {
      continue
    }
    if (tx.source === 'income_rule' && !knownIncome.has(tx.id)) {
      activity.push({
        kind: 'income_auto_posted',
        actorId: tx.createdBy,
        actorName: 'Авто-пополнение',
        transactionId: tx.id,
        occurrenceId: transactions.occurrenceByTransaction(tx.id)?.id,
        summary: `На счёт зачислено ${formatAmount(tx.amount)} — ${tx.title || 'Авто-пополнение'}`,
      })
    }
    if (tx.source === 'expense_rule' && !knownExpense.has(tx.id)) {
      activity.push({
        kind: 'expense_auto_posted',
        actorId: tx.createdBy,
        actorName: 'Регулярный расход',
        transactionId: tx.id,
        occurrenceId: transactions.occurrenceByTransaction(tx.id)?.id,
        summary: `Со счёта списано ${formatAmount(tx.amount)} — ${tx.title || 'Регулярный расход'}`,
      })
    }
  }
}

export async function bootstrapAccountSession() {
  await ensureProfile()
  await loadAccountData()
  await useTransactionStore().applyDue(todayLocal())
  notifyRecentAutoRules()
  startAccountRealtime()
}

export function resetAccountSession() {
  stopAccountRealtime()
  useAccountStore().reset()
  useCategoryStore().reset()
  usePurchaseStore().reset()
  useIncomeRuleStore().reset()
  useExpenseRuleStore().reset()
  useTransactionStore().reset()
  useActivityStore().reset()
}
