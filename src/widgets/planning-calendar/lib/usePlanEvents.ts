import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  addDays,
  formatLocalDate,
  incomeOccurrences,
  isPastDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useExpenseRuleStore, type ExpenseRule } from '@/entities/expense-rule'
import { useIncomeRuleStore, type IncomeRule } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore, type TransferRule } from '@/entities/transfer-rule'

export type PlanScope = 'all' | 'purchases' | 'regular'
export type PlanEventKind = 'purchase' | 'income' | 'expense' | 'transfer'

export type PlanEvent = {
  key: string
  kind: PlanEventKind
  date: string | null
  title: string
  amount: number
  accountId: string
  accountLabel: string
  overdue: boolean
  purchaseId?: string
  ruleId?: string
  active?: boolean
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  notes?: string
  period?: string
  inflow?: boolean
}

const WEEKDAYS = [
  { value: 0, label: 'воскресенье' },
  { value: 1, label: 'понедельник' },
  { value: 2, label: 'вторник' },
  { value: 3, label: 'среда' },
  { value: 4, label: 'четверг' },
  { value: 5, label: 'пятница' },
  { value: 6, label: 'суббота' },
]

const KIND_ORDER: Record<PlanEventKind, number> = {
  purchase: 0,
  income: 1,
  expense: 2,
  transfer: 3,
}

export const PLAN_KIND_LABEL: Record<PlanEventKind, string> = {
  purchase: 'Покупка',
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
}

export const PLAN_KIND_TAG: Record<PlanEventKind, 'default' | 'success' | 'warning' | 'info'> = {
  purchase: 'default',
  income: 'success',
  expense: 'warning',
  transfer: 'info',
}

export function isPlanScope(value: unknown): value is PlanScope {
  return value === 'all' || value === 'purchases' || value === 'regular'
}

function rulePeriod(rule: { frequency: string; weekday?: number; monthDay?: number }) {
  if (rule.frequency === 'monthly') {
    return `каждый месяц, ${rule.monthDay}-го`
  }
  if (rule.frequency === 'weekly') {
    const day = WEEKDAYS.find((item) => item.value === rule.weekday)?.label ?? ''
    return `каждую неделю, ${day}`
  }
  return 'раз в две недели'
}

export function usePlanEvents(
  scope: MaybeRefOrGetter<PlanScope>,
  range: MaybeRefOrGetter<{ start: string; end: string } | null>,
) {
  const accounts = useAccountStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transferRules = useTransferRuleStore()
  const transactions = useTransactionStore()

  function accountName(id: string) {
    return accounts.getById(id)?.name ?? 'Счёт'
  }

  function transferTitle(rule: TransferRule, selected: string) {
    if (rule.title?.trim()) {
      return rule.title.trim()
    }
    const from = accountName(rule.fromAccountId)
    const to = accountName(rule.toAccountId)
    if (selected === ALL_ACCOUNTS_ID) {
      return `${from} → ${to}`
    }
    if (selected === rule.fromAccountId) {
      return `Перевод на «${to}»`
    }
    return `Перевод со счёта «${from}»`
  }

  function nextDate(rule: IncomeRule | ExpenseRule | TransferRule, posted: string[]): string | null {
    const today = parseLocalDate(todayLocal())
    const dates = incomeOccurrences(rule, addDays(today, -1), addDays(today, 365), posted)
    const first = dates[0]
    return first ? formatLocalDate(first) : null
  }

  const events = computed(() => {
    const currentScope = toValue(scope)
    const currentRange = toValue(range)
    const today = todayLocal()
    const selected = accounts.selectedAccountId
    const showPurchases = currentScope !== 'regular'
    const showRules = currentScope !== 'purchases'
    const includeInactive = currentScope === 'regular' && !currentRange
    const list: PlanEvent[] = []

    if (showPurchases) {
      const source =
        selected === ALL_ACCOUNTS_ID
          ? purchases.planned
          : purchases.planned.filter((item) => item.accountId === selected)
      for (const item of source) {
        if (currentRange) {
          if (
            !item.plannedDate ||
            item.plannedDate < currentRange.start ||
            item.plannedDate > currentRange.end
          ) {
            continue
          }
        }
        list.push({
          key: `purchase:${item.id}`,
          kind: 'purchase',
          date: item.plannedDate ?? null,
          title: item.title,
          amount: item.amount,
          accountId: item.accountId,
          accountLabel: accountName(item.accountId),
          overdue: Boolean(item.plannedDate && isPastDate(item.plannedDate, today)),
          purchaseId: item.id,
          categoryName: item.categoryName,
          categoryIcon: item.categoryIcon,
          categoryColor: item.categoryColor,
          notes: item.notes,
        })
      }
    }

    if (showRules) {
      const incomeAll =
        selected === ALL_ACCOUNTS_ID ? incomeRules.items : incomeRules.forAccount(selected)
      const expenseAll =
        selected === ALL_ACCOUNTS_ID ? expenseRules.items : expenseRules.forAccount(selected)
      const transferAll =
        selected === ALL_ACCOUNTS_ID ? transferRules.items : transferRules.forAccount(selected)
      const incomeSource = includeInactive ? incomeAll : incomeAll.filter((rule) => rule.active)
      const expenseSource = includeInactive ? expenseAll : expenseAll.filter((rule) => rule.active)
      const transferSource = includeInactive
        ? transferAll
        : transferAll.filter((rule) => rule.active)

      if (currentRange) {
        const asOf = addDays(parseLocalDate(currentRange.start), -1)
        const target = parseLocalDate(currentRange.end)
        for (const rule of incomeSource) {
          const dates = incomeOccurrences(rule, asOf, target, transactions.occurrenceDatesFor(rule.id))
          for (const date of dates) {
            const iso = formatLocalDate(date)
            list.push({
              key: `income:${rule.id}:${iso}`,
              kind: 'income',
              date: iso,
              title: rule.title?.trim() || 'Пополнение',
              amount: rule.amount,
              accountId: rule.accountId,
              accountLabel: accountName(rule.accountId),
              overdue: false,
              ruleId: rule.id,
              active: rule.active,
              period: rulePeriod(rule),
            })
          }
        }
        for (const rule of expenseSource) {
          const dates = incomeOccurrences(
            rule,
            asOf,
            target,
            transactions.expenseOccurrenceDatesFor(rule.id),
          )
          for (const date of dates) {
            const iso = formatLocalDate(date)
            list.push({
              key: `expense:${rule.id}:${iso}`,
              kind: 'expense',
              date: iso,
              title: rule.title?.trim() || 'Регулярный расход',
              amount: rule.amount,
              accountId: rule.accountId,
              accountLabel: accountName(rule.accountId),
              overdue: false,
              ruleId: rule.id,
              active: rule.active,
              period: rulePeriod(rule),
            })
          }
        }
        for (const rule of transferSource) {
          const dates = incomeOccurrences(
            rule,
            asOf,
            target,
            transactions.transferOccurrenceDatesFor(rule.id),
          )
          for (const date of dates) {
            const iso = formatLocalDate(date)
            list.push({
              key: `transfer:${rule.id}:${iso}`,
              kind: 'transfer',
              date: iso,
              title: transferTitle(rule, selected),
              amount: rule.amount,
              accountId: rule.fromAccountId,
              accountLabel: `${accountName(rule.fromAccountId)} → ${accountName(rule.toAccountId)}`,
              overdue: false,
              ruleId: rule.id,
              active: rule.active,
              period: rulePeriod(rule),
              ...(selected === ALL_ACCOUNTS_ID ? {} : { inflow: rule.toAccountId === selected }),
            })
          }
        }
      } else {
        for (const rule of incomeSource) {
          list.push({
            key: `income:${rule.id}`,
            kind: 'income',
            date: rule.active ? nextDate(rule, transactions.occurrenceDatesFor(rule.id)) : null,
            title: rule.title?.trim() || 'Пополнение',
            amount: rule.amount,
            accountId: rule.accountId,
            accountLabel: accountName(rule.accountId),
            overdue: false,
            ruleId: rule.id,
            active: rule.active,
            period: rulePeriod(rule),
          })
        }
        for (const rule of expenseSource) {
          list.push({
            key: `expense:${rule.id}`,
            kind: 'expense',
            date: rule.active ? nextDate(rule, transactions.expenseOccurrenceDatesFor(rule.id)) : null,
            title: rule.title?.trim() || 'Регулярный расход',
            amount: rule.amount,
            accountId: rule.accountId,
            accountLabel: accountName(rule.accountId),
            overdue: false,
            ruleId: rule.id,
            active: rule.active,
            period: rulePeriod(rule),
          })
        }
        for (const rule of transferSource) {
          list.push({
            key: `transfer:${rule.id}`,
            kind: 'transfer',
            date: rule.active
              ? nextDate(rule, transactions.transferOccurrenceDatesFor(rule.id))
              : null,
            title: transferTitle(rule, selected),
            amount: rule.amount,
            accountId: rule.fromAccountId,
            accountLabel: `${accountName(rule.fromAccountId)} → ${accountName(rule.toAccountId)}`,
            overdue: false,
            ruleId: rule.id,
            active: rule.active,
            period: rulePeriod(rule),
            ...(selected === ALL_ACCOUNTS_ID ? {} : { inflow: rule.toAccountId === selected }),
          })
        }
      }
    }

    return list.sort((a, b) => {
      if (a.overdue !== b.overdue) {
        return a.overdue ? -1 : 1
      }
      if (Boolean(a.date) !== Boolean(b.date)) {
        return a.date ? -1 : 1
      }
      if (a.date && b.date) {
        const byDate = a.date.localeCompare(b.date)
        if (byDate !== 0) {
          return byDate
        }
      }
      const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      if (byKind !== 0) {
        return byKind
      }
      return a.title.localeCompare(b.title, 'ru')
    })
  })

  const eventsByDate = computed(() => {
    const map = new Map<string, PlanEvent[]>()
    for (const item of events.value) {
      if (!item.date) {
        continue
      }
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  })

  return { events, eventsByDate }
}
