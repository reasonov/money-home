<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  AppButton,
  AppField,
  AppInput,
  AppSelect,
  confirmAction,
  formatMoney,
  getErrorMessage,
  todayLocal,
  type IncomeFrequency,
} from '@/shared'
import { useIncomeRuleStore, type IncomeRule } from '@/entities/income-rule'
import { useSessionStore } from '@/entities/session'

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
const formRef = ref<HTMLElement | null>(null)

const editingId = ref<string | null>(null)
const amount = ref('')
const frequency = ref<IncomeFrequency>('monthly')
const weekday = ref('5')
const monthDay = ref('10')
const anchorDate = ref(todayLocal())
const error = ref('')
const pending = ref(false)

const frequencyLabel = computed(() => ({
  weekly: 'каждую неделю',
  biweekly: 'раз в две недели',
  monthly: 'каждый месяц',
}))

const formTitle = computed(() => (editingId.value ? 'Изменить правило' : 'Новое правило'))
const submitLabel = computed(() => {
  if (pending.value) {
    return editingId.value ? 'Сохраняем…' : 'Добавляем…'
  }
  return editingId.value ? 'Сохранить правило' : 'Добавить правило'
})

function ruleSummary(rule: IncomeRule): string {
  if (rule.frequency === 'monthly') {
    return `${formatMoney(rule.amount)} · ${frequencyLabel.value.monthly}, ${rule.monthDay}-го`
  }
  if (rule.frequency === 'weekly') {
    const day = WEEKDAYS.find((item) => item.value === String(rule.weekday))?.label ?? ''
    return `${formatMoney(rule.amount)} · ${frequencyLabel.value.weekly}, ${day.toLowerCase()}`
  }
  return `${formatMoney(rule.amount)} · ${frequencyLabel.value.biweekly}`
}

function resetForm() {
  editingId.value = null
  amount.value = ''
  frequency.value = 'monthly'
  weekday.value = '5'
  monthDay.value = '10'
  anchorDate.value = todayLocal()
  error.value = ''
}

async function focusForm() {
  await nextTick()
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const input = formRef.value?.querySelector('input')
  input?.focus()
}

function fillForm(rule: IncomeRule) {
  editingId.value = rule.id
  amount.value = String(rule.amount)
  frequency.value = rule.frequency
  weekday.value = String(rule.weekday ?? 5)
  monthDay.value = String(rule.monthDay ?? 10)
  anchorDate.value = rule.anchorDate ?? todayLocal()
  error.value = ''
  void focusForm()
}

function buildPayload(): Omit<IncomeRule, 'id'> | null {
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    error.value = 'Укажите сумму'
    return null
  }

  const payload: Omit<IncomeRule, 'id'> = {
    amount: value,
    frequency: frequency.value,
    active: true,
  }

  if (frequency.value === 'monthly') {
    const day = Number(monthDay.value)
    if (day < 1 || day > 28) {
      error.value = 'День месяца: 1–28'
      return null
    }
    payload.monthDay = day
  }

  if (frequency.value === 'weekly') {
    payload.weekday = Number(weekday.value)
  }

  if (frequency.value === 'biweekly') {
    payload.weekday = Number(weekday.value)
    payload.anchorDate = anchorDate.value
  }

  return payload
}

async function onSubmit() {
  error.value = ''
  const userId = session.user?.id
  if (!userId) {
    return
  }

  const payload = buildPayload()
  if (!payload) {
    return
  }

  pending.value = true
  try {
    if (editingId.value) {
      const existing = store.items.find((item) => item.id === editingId.value)
      await store.updateRule(editingId.value, userId, {
        ...payload,
        active: existing?.active ?? true,
      })
    } else {
      await store.addRule(userId, payload)
    }
    resetForm()
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить правило')
  } finally {
    pending.value = false
  }
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
    if (editingId.value === id) {
      resetForm()
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить правило')
  }
}

async function onToggle(rule: IncomeRule) {
  const userId = session.user?.id
  if (!userId) {
    return
  }
  try {
    await store.updateRule(rule.id, userId, { active: !rule.active })
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить правило')
  }
}
</script>

<template>
  <div class="income">
    <ul v-if="store.items.length" class="income__list">
      <li v-for="rule in store.items" :key="rule.id" class="income__item">
        <div>
          <p class="income__title money">{{ ruleSummary(rule) }}</p>
          <p class="income__meta">{{ rule.active ? 'Активно' : 'Выключено' }}</p>
        </div>
        <div class="income__actions">
          <AppButton variant="ghost" @click="fillForm(rule)">Изменить</AppButton>
          <AppButton variant="ghost" @click="onToggle(rule)">
            {{ rule.active ? 'Выкл' : 'Вкл' }}
          </AppButton>
          <AppButton variant="danger" @click="onRemove(rule.id)">Удалить</AppButton>
        </div>
      </li>
    </ul>
    <div v-else class="income__empty">
      <p class="income__empty-text">
        Пока нет правил пополнения. Без них приложение не сможет подсказать, когда хватит денег на
        покупку.
      </p>
      <AppButton variant="secondary" block @click="focusForm">Добавить пополнение</AppButton>
    </div>

    <form ref="formRef" class="form" @submit.prevent="onSubmit">
      <div class="form__head">
        <h2 class="form__title">{{ formTitle }}</h2>
        <AppButton v-if="editingId" type="button" variant="ghost" @click="resetForm">
          Отмена
        </AppButton>
      </div>
      <AppField label="Сумма, ₽" for-id="income-amount">
        <AppInput
          id="income-amount"
          v-model="amount"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          required
        />
      </AppField>
      <AppField label="Частота" for-id="income-frequency">
        <AppSelect id="income-frequency" v-model="frequency">
          <option value="monthly">Ежемесячно</option>
          <option value="weekly">Еженедельно</option>
          <option value="biweekly">Раз в две недели</option>
        </AppSelect>
      </AppField>
      <AppField v-if="frequency === 'monthly'" label="День месяца" for-id="income-month-day">
        <AppInput
          id="income-month-day"
          v-model="monthDay"
          type="number"
          min="1"
          max="28"
          required
        />
      </AppField>
      <AppField
        v-if="frequency === 'weekly' || frequency === 'biweekly'"
        label="День недели"
        for-id="income-weekday"
      >
        <AppSelect id="income-weekday" v-model="weekday">
          <option v-for="day in WEEKDAYS" :key="day.value" :value="day.value">
            {{ day.label }}
          </option>
        </AppSelect>
      </AppField>
      <AppField v-if="frequency === 'biweekly'" label="Дата отсчёта" for-id="income-anchor">
        <AppInput id="income-anchor" v-model="anchorDate" type="date" required />
      </AppField>
      <p v-if="error" class="form__error" role="alert">{{ error }}</p>
      <AppButton type="submit" block :disabled="pending">{{ submitLabel }}</AppButton>
    </form>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.income__title {
  font-weight: 700;
}

.income__meta {
  margin-top: var(--space-1);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.income__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.form__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.form__title {
  font-size: 1.125rem;
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
