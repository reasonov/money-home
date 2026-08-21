<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AppButton,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  getErrorMessage,
  todayLocal,
  type IncomeFrequency,
  type RuleFormDraft,
} from '@/shared'
import { useIncomeRuleStore, type IncomeRule } from '@/entities/income-rule'
import { useSessionStore } from '@/entities/session'
import { useAccountStore } from '@/entities/account'
import { CategorySelect, useCategoryStore } from '@/entities/category'

const WEEKDAYS = [
  { value: '0', label: 'Воскресенье' },
  { value: '1', label: 'Понедельник' },
  { value: '2', label: 'Вторник' },
  { value: '3', label: 'Среда' },
  { value: '4', label: 'Четверг' },
  { value: '5', label: 'Пятница' },
  { value: '6', label: 'Суббота' },
]

const props = defineProps<{
  ruleId?: string
  accountId?: string
  draft?: RuleFormDraft
}>()

const emit = defineEmits<{
  saved: []
}>()

const store = useIncomeRuleStore()
const session = useSessionStore()
const accounts = useAccountStore()
const categories = useCategoryStore()

const existing = props.ruleId ? store.items.find((item) => item.id === props.ruleId) : undefined
const draft = existing ? undefined : props.draft

const accountId = ref(
  existing?.accountId ??
    draft?.accountId ??
    accounts.getById(props.accountId ?? '')?.id ??
    accounts.items[0]?.id ??
    '',
)
const title = ref(existing?.title ?? draft?.title ?? '')
const categoryId = ref(existing?.categoryId ?? draft?.categoryId ?? '')
const amount = ref(existing ? String(existing.amount) : draft ? String(draft.amount) : '')
const frequency = ref<IncomeFrequency>(existing?.frequency ?? draft?.frequency ?? 'monthly')
const weekday = ref(String(existing?.weekday ?? draft?.weekday ?? 5))
const monthDay = ref(String(existing?.monthDay ?? draft?.monthDay ?? 10))
const anchorDate = ref(existing?.anchorDate ?? todayLocal())
const error = ref('')
const pending = ref(false)

const submitLabel = computed(() => {
  if (pending.value) {
    return existing ? 'Сохраняем…' : 'Добавляем…'
  }
  return existing ? 'Сохранить пополнение' : 'Добавить пополнение'
})

function buildPayload(): Omit<IncomeRule, 'id'> | null {
  if (!accountId.value) {
    error.value = 'Выберите счёт'
    return null
  }

  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    error.value = 'Укажите сумму больше 0 ₽'
    return null
  }

  const payload: Omit<IncomeRule, 'id'> = {
    accountId: accountId.value,
    amount: value,
    frequency: frequency.value,
    active: existing?.active ?? true,
    ...(title.value.trim() ? { title: title.value.trim() } : {}),
    ...(categoryId.value ? { categoryId: categoryId.value } : {}),
  }

  if (frequency.value === 'monthly') {
    const day = Number(monthDay.value)
    if (day < 1 || day > 28) {
      error.value = 'Выберите день месяца от 1 до 28'
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
    if (existing) {
      await store.updateRule(existing.id, userId, payload)
    } else {
      await store.addRule(userId, payload)
    }
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить правило')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Счёт" for-id="income-account" required>
      <AppSelect id="income-account" v-model="accountId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="income-title">
      <AppInput id="income-title" v-model="title" placeholder="Зарплата" />
    </AppField>
    <AppField label="Категория дохода" for-id="income-cat">
      <CategorySelect
        id="income-cat"
        v-model="categoryId"
        :categories="categories.forAccount(accountId, 'income')"
        allow-empty
        empty-label="Без категории"
      />
    </AppField>
    <AppField label="Сумма, ₽" for-id="income-amount" required>
      <AppInputNumber id="income-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="Частота" for-id="income-frequency" required>
      <AppSelect id="income-frequency" v-model="frequency">
        <option value="monthly">Ежемесячно</option>
        <option value="weekly">Еженедельно</option>
        <option value="biweekly">Раз в две недели</option>
      </AppSelect>
    </AppField>
    <AppField
      v-if="frequency === 'monthly'"
      label="День месяца"
      for-id="income-month-day"
      hint="До 28-го числа, чтобы дата была в каждом месяце"
      required
    >
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
      required
    >
      <AppSelect id="income-weekday" v-model="weekday">
        <option v-for="day in WEEKDAYS" :key="day.value" :value="day.value">
          {{ day.label }}
        </option>
      </AppSelect>
    </AppField>
    <AppField
      v-if="frequency === 'biweekly'"
      label="Первая дата пополнения"
      for-id="income-anchor"
      hint="Дальше пополнение будет повторяться каждые две недели"
      required
    >
      <AppInput id="income-anchor" v-model="anchorDate" type="date" required />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">{{ submitLabel }}</AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
