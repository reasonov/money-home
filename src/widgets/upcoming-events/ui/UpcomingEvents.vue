<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  addDays,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  incomeOccurrences,
  isPastDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore, type TransferRule } from '@/entities/transfer-rule'

type UpcomingKind = 'purchase' | 'income' | 'expense' | 'transfer'

interface UpcomingEvent {
  id: string
  date: string
  kind: UpcomingKind
  title: string
  amount: number
  overdue: boolean
  purchaseId?: string
  inflow?: boolean
}

const router = useRouter()
const accounts = useAccountStore()
const purchases = usePurchaseStore()
const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const transactions = useTransactionStore()

const events = computed(() => {
  const today = todayLocal()
  const asOf = parseLocalDate(today)
  const horizon = addDays(asOf, 7)
  const yesterday = addDays(asOf, -1)
  const selected = accounts.selectedAccountId
  const list: UpcomingEvent[] = []

  const purchaseSource =
    selected === ALL_ACCOUNTS_ID
      ? purchases.planned
      : purchases.planned.filter((item) => item.accountId === selected)

  for (const item of purchaseSource) {
    const overdue = isPastDate(item.plannedDate, today)
    if (!overdue && (item.plannedDate < today || item.plannedDate > formatLocalDate(horizon))) {
      continue
    }
    list.push({
      id: `p-${item.id}`,
      date: item.plannedDate,
      kind: 'purchase',
      title: item.title,
      amount: item.amount,
      overdue,
      purchaseId: item.id,
    })
  }

  const rules =
    selected === ALL_ACCOUNTS_ID
      ? incomeRules.items.filter((rule) => rule.active)
      : incomeRules.forAccount(selected).filter((rule) => rule.active)
  for (const rule of rules) {
    const dates = incomeOccurrences(
      rule,
      yesterday,
      horizon,
      transactions.occurrenceDatesFor(rule.id),
    )
    for (const date of dates) {
      const iso = formatLocalDate(date)
      list.push({
        id: `i-${rule.id}-${iso}`,
        date: iso,
        kind: 'income',
        title: rule.title?.trim() || 'Пополнение',
        amount: rule.amount,
        overdue: false,
      })
    }
  }

  const expenseList =
    selected === ALL_ACCOUNTS_ID
      ? expenseRules.items.filter((rule) => rule.active)
      : expenseRules.forAccount(selected).filter((rule) => rule.active)
  for (const rule of expenseList) {
    const dates = incomeOccurrences(
      rule,
      yesterday,
      horizon,
      transactions.expenseOccurrenceDatesFor(rule.id),
    )
    for (const date of dates) {
      const iso = formatLocalDate(date)
      list.push({
        id: `e-${rule.id}-${iso}`,
        date: iso,
        kind: 'expense',
        title: rule.title?.trim() || 'Регулярный расход',
        amount: rule.amount,
        overdue: false,
      })
    }
  }

  const transferList =
    selected === ALL_ACCOUNTS_ID
      ? transferRules.items.filter((rule) => rule.active)
      : transferRules.forAccount(selected).filter((rule) => rule.active)
  for (const rule of transferList) {
    const dates = incomeOccurrences(
      rule,
      yesterday,
      horizon,
      transactions.transferOccurrenceDatesFor(rule.id),
    )
    for (const date of dates) {
      const iso = formatLocalDate(date)
      list.push({
        id: `t-${rule.id}-${iso}`,
        date: iso,
        kind: 'transfer',
        title: transferTitle(rule, selected),
        amount: rule.amount,
        overdue: false,
        ...(selected === ALL_ACCOUNTS_ID ? {} : { inflow: rule.toAccountId === selected }),
      })
    }
  }

  return list.sort((a, b) => {
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1
    }
    return a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ru')
  })
})

function dateLabel(iso: string, overdue: boolean) {
  if (overdue) {
    return `Просрочено · ${formatShortDate(iso)}`
  }
  if (iso === todayLocal()) {
    return 'Сегодня'
  }
  return formatShortDate(iso)
}

function transferTitle(rule: TransferRule, selected: string) {
  if (rule.title?.trim()) {
    return rule.title.trim()
  }
  const from = accounts.getById(rule.fromAccountId)?.name ?? 'Счёт'
  const to = accounts.getById(rule.toAccountId)?.name ?? 'Счёт'
  if (selected === ALL_ACCOUNTS_ID) {
    return `${from} → ${to}`
  }
  if (selected === rule.fromAccountId) {
    return `Перевод на «${to}»`
  }
  return `Перевод со счёта «${from}»`
}

function amountTone(item: UpcomingEvent) {
  if (item.kind === 'income' || item.inflow) {
    return 'in'
  }
  if (item.kind === 'transfer' && item.inflow == null) {
    return 'xfer'
  }
  return 'out'
}

function amountPrefix(item: UpcomingEvent) {
  const tone = amountTone(item)
  if (tone === 'in') {
    return '+'
  }
  if (tone === 'out') {
    return '−'
  }
  return ''
}

function openEvent(item: UpcomingEvent) {
  if (item.purchaseId) {
    void router.push({ name: 'calendar', query: { purchase: item.purchaseId } })
    return
  }
  void router.push({ name: 'income' })
}
</script>

<template>
  <section v-if="events.length" class="upcoming" data-tour="home-upcoming" aria-label="Ближайшие 7 дней">
    <h2 class="upcoming__title">Ближайшие 7 дней</h2>
    <ul class="upcoming__list">
      <li v-for="item in events" :key="item.id">
        <button class="row" type="button" @click="openEvent(item)">
          <span class="row__body">
            <span class="row__title">{{ item.title }}</span>
            <span class="row__meta" :class="{ 'is-overdue': item.overdue }">
              {{ dateLabel(item.date, item.overdue) }}
            </span>
          </span>
          <span class="row__amount" :class="`is-${amountTone(item)}`">
            {{ amountPrefix(item) }}{{ formatMoney(item.amount) }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.upcoming {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.upcoming__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.upcoming__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row__body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.row__title {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.row__meta.is-overdue {
  color: var(--color-warning);
}

.row__amount {
  flex-shrink: 0;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}

.is-xfer {
  color: var(--color-accent);
}
</style>
