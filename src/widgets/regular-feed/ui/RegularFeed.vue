<script setup lang="ts">
import { computed, ref } from 'vue'
import { EllipsisVertical } from '@lucide/vue'
import { NDropdown, type DropdownOption } from 'naive-ui'
import {
  addDays,
  AppButton,
  AppSwitch,
  AppTag,
  confirmAction,
  formatLocalDate,
  formatMoney,
  formatRelativeDisplayDate,
  getErrorMessage,
  incomeOccurrences,
  openFormDrawer,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useExpenseRuleStore, type ExpenseRule } from '@/entities/expense-rule'
import { useIncomeRuleStore, type IncomeRule } from '@/entities/income-rule'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore, type TransferRule } from '@/entities/transfer-rule'

type RuleKind = 'income' | 'expense' | 'transfer'

type FeedItem = {
  key: string
  id: string
  kind: RuleKind
  amount: number
  title?: string
  active: boolean
  date: string | null
  accountLabel: string
  period: string
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

const KIND_ORDER: Record<RuleKind, number> = {
  income: 0,
  expense: 1,
  transfer: 2,
}

const KIND_LABEL: Record<RuleKind, string> = {
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
}

const KIND_TAG: Record<RuleKind, 'success' | 'warning' | 'info'> = {
  income: 'success',
  expense: 'warning',
  transfer: 'info',
}

const NONE_DATE = 'none'

const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const accounts = useAccountStore()
const session = useSessionStore()
const transactions = useTransactionStore()
const error = ref('')
const togglingKey = ref<string | null>(null)

const menuOptions: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

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

function nextDate(
  rule: IncomeRule | ExpenseRule | TransferRule,
  posted: string[],
): string | null {
  const today = parseLocalDate(todayLocal())
  const dates = incomeOccurrences(
    { ...rule, active: true },
    addDays(today, -1),
    addDays(today, 365),
    posted,
  )
  const first = dates[0]
  return first ? formatLocalDate(first) : null
}

function accountName(id: string) {
  return accounts.getById(id)?.name ?? 'Счёт'
}

const items = computed<FeedItem[]>(() => {
  const list: FeedItem[] = []

  for (const rule of incomeRules.items) {
    list.push({
      key: `income:${rule.id}`,
      id: rule.id,
      kind: 'income',
      amount: rule.amount,
      title: rule.title,
      active: rule.active,
      date: nextDate(rule, transactions.occurrenceDatesFor(rule.id)),
      accountLabel: accountName(rule.accountId),
      period: rulePeriod(rule),
    })
  }

  for (const rule of expenseRules.items) {
    list.push({
      key: `expense:${rule.id}`,
      id: rule.id,
      kind: 'expense',
      amount: rule.amount,
      title: rule.title,
      active: rule.active,
      date: nextDate(rule, transactions.expenseOccurrenceDatesFor(rule.id)),
      accountLabel: accountName(rule.accountId),
      period: rulePeriod(rule),
    })
  }

  for (const rule of transferRules.items) {
    list.push({
      key: `transfer:${rule.id}`,
      id: rule.id,
      kind: 'transfer',
      amount: rule.amount,
      title: rule.title,
      active: rule.active,
      date: nextDate(rule, transactions.transferOccurrenceDatesFor(rule.id)),
      accountLabel: `${accountName(rule.fromAccountId)} → ${accountName(rule.toAccountId)}`,
      period: rulePeriod(rule),
    })
  }

  return list.sort((a, b) => {
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
    return (a.title ?? '').localeCompare(b.title ?? '', 'ru')
  })
})

const groups = computed(() => {
  const map = new Map<string, FeedItem[]>()
  for (const item of items.value) {
    const key = item.date ?? NONE_DATE
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return [...map.entries()].map(([key, groupItems]) => ({
    key,
    title: key === NONE_DATE ? 'По расписанию' : formatRelativeDisplayDate(key),
    items: groupItems,
  }))
})

function amountPrefix(kind: RuleKind) {
  if (kind === 'income') {
    return '+'
  }
  if (kind === 'expense') {
    return '−'
  }
  return ''
}

function amountTone(kind: RuleKind) {
  if (kind === 'income') {
    return 'in'
  }
  if (kind === 'expense') {
    return 'out'
  }
  return 'xfer'
}

function openCreate(kind: RuleKind) {
  if (kind === 'income') {
    openFormDrawer({ name: 'income-rule' })
    return
  }
  if (kind === 'expense') {
    openFormDrawer({ name: 'expense-rule' })
    return
  }
  openFormDrawer({ name: 'transfer-rule' })
}

function openEdit(item: FeedItem) {
  if (item.kind === 'income') {
    openFormDrawer({ name: 'income-rule', ruleId: item.id })
    return
  }
  if (item.kind === 'expense') {
    openFormDrawer({ name: 'expense-rule', ruleId: item.id })
    return
  }
  openFormDrawer({ name: 'transfer-rule', ruleId: item.id })
}

async function onRemove(item: FeedItem) {
  const titles = {
    income: 'Удалить регулярное пополнение?',
    expense: 'Удалить регулярный расход?',
    transfer: 'Удалить регулярный перевод?',
  }
  const messages = {
    income: 'Будущие пополнения по этому расписанию не будут зачисляться и учитываться в прогнозе.',
    expense: 'Будущие списания по этому расписанию не будут выполняться и учитываться в прогнозе.',
    transfer: 'Будущие переводы по этому расписанию не будут выполняться и учитываться в прогнозе.',
  }
  const ok = await confirmAction({
    title: titles[item.kind],
    message: messages[item.kind],
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) {
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }
  try {
    if (item.kind === 'income') {
      await incomeRules.removeRule(item.id, userId)
    } else if (item.kind === 'expense') {
      await expenseRules.removeRule(item.id, userId)
    } else {
      await transferRules.removeRule(item.id, userId)
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить правило')
  }
}

async function onToggle(item: FeedItem, active: boolean) {
  if (item.active === active || togglingKey.value === item.key) {
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }
  togglingKey.value = item.key
  try {
    if (item.kind === 'income') {
      await incomeRules.updateRule(item.id, userId, { active })
    } else if (item.kind === 'expense') {
      await expenseRules.updateRule(item.id, userId, { active })
    } else {
      await transferRules.updateRule(item.id, userId, { active })
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить правило')
  } finally {
    togglingKey.value = null
  }
}

function onMenu(item: FeedItem, key: string | number) {
  if (key === 'edit') {
    openEdit(item)
    return
  }
  if (key === 'remove') {
    void onRemove(item)
  }
}
</script>

<template>
  <div class="feed">
    <div v-if="groups.length" class="feed__groups">
      <section v-for="group in groups" :key="group.key" class="group">
        <h3 class="group__date">{{ group.title }}</h3>
        <ul class="group__items">
          <li
            v-for="item in group.items"
            :key="item.key"
            class="item"
            :class="{ 'is-off': !item.active }"
          >
            <div class="item__top">
              <p class="item__amount money" :class="`is-${amountTone(item.kind)}`">
                {{ amountPrefix(item.kind) }}{{ formatMoney(item.amount) }}
              </p>
              <div class="item__controls">
                <AppSwitch
                  size="small"
                  :checked="item.active"
                  :loading="togglingKey === item.key"
                  :aria-label="item.active ? 'Выключить правило' : 'Включить правило'"
                  @update:checked="(active) => onToggle(item, active)"
                />
                <NDropdown
                  trigger="click"
                  placement="bottom-end"
                  :options="menuOptions"
                  @select="(key) => onMenu(item, key)"
                >
                  <button type="button" class="item__more" aria-label="Ещё действия">
                    <EllipsisVertical :size="16" :stroke-width="2" />
                  </button>
                </NDropdown>
              </div>
            </div>
            <p v-if="item.title" class="item__title">{{ item.title }}</p>
            <p class="item__meta">
              <AppTag :type="KIND_TAG[item.kind]">{{ KIND_LABEL[item.kind] }}</AppTag>
              <span>{{ item.accountLabel }} · {{ item.period }}</span>
            </p>
          </li>
        </ul>
      </section>
    </div>
    <div v-else class="feed__empty">
      <p class="feed__empty-text">Пока нет регулярных операций</p>
    </div>

    <p v-if="error" class="feed__error" role="alert">{{ error }}</p>
    <div class="feed__cta">
      <AppButton variant="secondary" block @click="openCreate('income')">Пополнение</AppButton>
      <AppButton variant="secondary" block @click="openCreate('expense')">Расход</AppButton>
      <AppButton variant="secondary" block @click="openCreate('transfer')">Перевод</AppButton>
    </div>
  </div>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.feed__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.group__date {
  margin: 0 0 var(--space-3);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.group__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.item.is-off .item__amount,
.item.is-off .item__title,
.item.is-off .item__meta {
  opacity: 0.55;
}

.item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.item__amount {
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.item__title {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.item__controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-1);
}

.item__more {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.item__more:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.item__more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.feed__empty {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.feed__empty-text {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.feed__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}

.feed__cta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-3);
}

.money {
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
