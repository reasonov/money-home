<script setup lang="ts">
import { computed, ref } from 'vue'
import { EllipsisVertical } from '@lucide/vue'
import { NDropdown, type DropdownOption } from 'naive-ui'
import {
  AppButton,
  AppSwitch,
  confirmAction,
  formatMoney,
  getErrorMessage,
  openFormDrawer,
} from '@/shared'
import { useExpenseRuleStore, type ExpenseRule } from '@/entities/expense-rule'
import { useSessionStore } from '@/entities/session'
import { useAccountStore } from '@/entities/account'

const WEEKDAYS = [
  { value: '0', label: 'Воскресенье' },
  { value: '1', label: 'Понедельник' },
  { value: '2', label: 'Вторник' },
  { value: '3', label: 'Среда' },
  { value: '4', label: 'Четверг' },
  { value: '5', label: 'Пятница' },
  { value: '6', label: 'Суббота' },
]

const store = useExpenseRuleStore()
const session = useSessionStore()
const accounts = useAccountStore()
const error = ref('')
const togglingId = ref<string | null>(null)

const menuOptions: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

const frequencyLabel = computed(() => ({
  weekly: 'каждую неделю',
  biweekly: 'раз в две недели',
  monthly: 'каждый месяц',
}))

function rulePeriod(rule: ExpenseRule): string {
  if (rule.frequency === 'monthly') {
    return `${frequencyLabel.value.monthly}, ${rule.monthDay}-го`
  }
  if (rule.frequency === 'weekly') {
    const day = WEEKDAYS.find((item) => item.value === String(rule.weekday))?.label ?? ''
    return `${frequencyLabel.value.weekly}, ${day.toLowerCase()}`
  }
  return frequencyLabel.value.biweekly
}

function openCreate() {
  openFormDrawer({ name: 'expense-rule' })
}

async function onRemove(id: string) {
  const ok = await confirmAction({
    title: 'Удалить регулярный расход?',
    message: 'Будущие списания по этому расписанию не будут выполняться и учитываться в прогнозе.',
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
    await store.removeRule(id, userId)
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить правило')
  }
}

async function onToggle(rule: ExpenseRule, active: boolean) {
  if (rule.active === active || togglingId.value === rule.id) {
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }
  togglingId.value = rule.id
  try {
    await store.updateRule(rule.id, userId, { active })
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить правило')
  } finally {
    togglingId.value = null
  }
}

function onMenu(rule: ExpenseRule, key: string | number) {
  if (key === 'edit') {
    openFormDrawer({ name: 'expense-rule', ruleId: rule.id })
    return
  }
  if (key === 'remove') {
    void onRemove(rule.id)
  }
}
</script>

<template>
  <div class="expense">
    <ul v-if="store.items.length" class="expense__list">
      <li
        v-for="rule in store.items"
        :key="rule.id"
        class="expense__item"
        :class="{ 'is-off': !rule.active }"
      >
        <div class="expense__top">
          <p class="expense__amount money">{{ formatMoney(rule.amount) }}</p>
          <div class="expense__controls">
            <AppSwitch
              size="small"
              :checked="rule.active"
              :loading="togglingId === rule.id"
              :aria-label="rule.active ? 'Выключить правило' : 'Включить правило'"
              @update:checked="(active) => onToggle(rule, active)"
            />
            <NDropdown
              trigger="click"
              placement="bottom-end"
              :options="menuOptions"
              @select="(key) => onMenu(rule, key)"
            >
              <button type="button" class="expense__more" aria-label="Ещё действия">
                <EllipsisVertical :size="16" :stroke-width="2" />
              </button>
            </NDropdown>
          </div>
        </div>
        <p v-if="rule.title" class="expense__title">{{ rule.title }}</p>
        <p class="expense__meta">
          {{ accounts.getById(rule.accountId)?.name ?? 'Счёт' }}
          · {{ rulePeriod(rule) }}
        </p>
      </li>
    </ul>
    <div v-else class="expense__empty">
      <p class="expense__empty-text">
        Пока нет регулярных расходов. Аренда и подписки появятся в прогнозе, когда зададите правило.
      </p>
    </div>

    <p v-if="error" class="expense__error" role="alert">{{ error }}</p>
    <AppButton variant="secondary" block @click="openCreate">Добавить регулярный расход</AppButton>
  </div>
</template>

<style scoped>
.expense {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.expense__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.expense__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.expense__item.is-off .expense__amount,
.expense__item.is-off .expense__title,
.expense__item.is-off .expense__meta {
  opacity: 0.55;
}

.expense__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.expense__amount {
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.expense__title {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense__meta {
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense__controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-1);
}

.expense__more {
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

.expense__more:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.expense__more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.expense__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.expense__empty-text {
  color: var(--color-text-muted);
  line-height: 1.45;
}

.expense__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
