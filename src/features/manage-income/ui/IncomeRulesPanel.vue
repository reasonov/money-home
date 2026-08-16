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
import { useIncomeRuleStore, type IncomeRule } from '@/entities/income-rule'
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

const store = useIncomeRuleStore()
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

function rulePeriod(rule: IncomeRule): string {
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
  openFormDrawer({ name: 'income-rule' })
}

async function onRemove(id: string) {
  const ok = await confirmAction({
    title: 'Удалить правило?',
    message: 'Оно перестанет учитываться в прогнозе баланса.',
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

async function onToggle(rule: IncomeRule, active: boolean) {
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

function onMenu(rule: IncomeRule, key: string | number) {
  if (key === 'edit') {
    openFormDrawer({ name: 'income-rule', ruleId: rule.id })
    return
  }
  if (key === 'remove') {
    void onRemove(rule.id)
  }
}
</script>

<template>
  <div class="income" data-tour="income-rules">
    <ul v-if="store.items.length" class="income__list">
      <li
        v-for="rule in store.items"
        :key="rule.id"
        class="income__item"
        :class="{ 'is-off': !rule.active }"
      >
        <div class="income__top">
          <p class="income__amount money">{{ formatMoney(rule.amount) }}</p>
          <div class="income__controls">
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
              <button type="button" class="income__more" aria-label="Ещё действия">
                <EllipsisVertical :size="16" :stroke-width="2" />
              </button>
            </NDropdown>
          </div>
        </div>
        <p v-if="rule.title" class="income__title">{{ rule.title }}</p>
        <p class="income__meta">
          {{ accounts.getById(rule.accountId)?.name ?? 'Счёт' }}
          · {{ rulePeriod(rule) }}
        </p>
      </li>
    </ul>
    <div v-else class="income__empty">
      <p class="income__empty-text">
        Пока нет правил пополнения. Без них приложение не сможет подсказать, когда хватит денег на
        покупку.
      </p>
    </div>

    <p v-if="error" class="income__error" role="alert">{{ error }}</p>
    <AppButton variant="secondary" block @click="openCreate">Добавить правило</AppButton>
  </div>
</template>

<style scoped>
.income {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.income__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.income__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.income__item.is-off .income__amount,
.income__item.is-off .income__title,
.income__item.is-off .income__meta {
  opacity: 0.55;
}

.income__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.income__amount {
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.income__title {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.income__meta {
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.income__controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-1);
}

.income__more {
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

.income__more:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.income__more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.income__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.income__empty-text {
  color: var(--color-text-muted);
  line-height: 1.45;
}

.income__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
