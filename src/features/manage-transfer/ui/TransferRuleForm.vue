<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AppButton,
  AppEmpty,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  getErrorMessage,
  openFormDrawer,
  ruleScheduleFromDate,
  todayLocal,
  type IncomeFrequency,
} from '@/shared'
import { useTransferRuleStore, type TransferRule } from '@/entities/transfer-rule'
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

const props = defineProps<{
  ruleId?: string
  fromAccountId?: string
  startsOn?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const store = useTransferRuleStore()
const session = useSessionStore()
const accounts = useAccountStore()

const existing = props.ruleId ? store.items.find((item) => item.id === props.ruleId) : undefined
const schedule = !existing && props.startsOn ? ruleScheduleFromDate(props.startsOn) : undefined

const fromId = ref(
  existing?.fromAccountId ??
    accounts.getById(props.fromAccountId ?? '')?.id ??
    accounts.items[0]?.id ??
    '',
)
const toId = ref(
  existing?.toAccountId ?? accounts.items.find((item) => item.id !== fromId.value)?.id ?? '',
)
const title = ref(existing?.title ?? '')
const amount = ref(existing ? String(existing.amount) : '')
const frequency = ref<IncomeFrequency>(existing?.frequency ?? 'monthly')
const weekday = ref(String(existing?.weekday ?? schedule?.weekday ?? 5))
const monthDay = ref(String(existing?.monthDay ?? schedule?.monthDay ?? 10))
const anchorDate = ref(existing?.anchorDate ?? schedule?.startsOn ?? todayLocal())
const startsOn = ref(existing?.startsOn ?? schedule?.startsOn ?? todayLocal())
const error = ref('')
const pending = ref(false)

const submitLabel = computed(() => {
  if (pending.value) {
    return existing ? 'Сохраняем…' : 'Добавляем…'
  }
  return existing ? 'Сохранить перевод' : 'Добавить регулярный перевод'
})

watch(fromId, (id) => {
  if (toId.value === id) {
    toId.value = accounts.items.find((item) => item.id !== id)?.id ?? ''
  }
})

function swap() {
  const previous = fromId.value
  fromId.value = toId.value
  toId.value = previous
}

function buildPayload(): Omit<TransferRule, 'id'> | null {
  if (!fromId.value || !toId.value) {
    error.value = 'Выберите счета'
    return null
  }
  if (fromId.value === toId.value) {
    error.value = 'Выберите разные счета'
    return null
  }

  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    error.value = 'Укажите сумму больше 0 ₽'
    return null
  }

  if (!startsOn.value) {
    error.value = 'Укажите дату начала'
    return null
  }

  const payload: Omit<TransferRule, 'id'> = {
    fromAccountId: fromId.value,
    toAccountId: toId.value,
    amount: value,
    frequency: frequency.value,
    startsOn: startsOn.value,
    active: existing?.active ?? true,
    ...(title.value.trim() ? { title: title.value.trim() } : {}),
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
  <AppEmpty v-if="accounts.items.length < 2" description="Для регулярного перевода нужно минимум два счёта">
    <AppButton block @click="openFormDrawer({ name: 'account' })">Добавить счёт</AppButton>
  </AppEmpty>

  <form v-else class="form" @submit.prevent="onSubmit">
    <AppField label="Откуда" for-id="transfer-rule-from" required>
      <AppSelect id="transfer-rule-from" v-model="fromId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }}
        </option>
      </AppSelect>
    </AppField>
    <AppButton type="button" variant="ghost" block @click="swap">Поменять местами</AppButton>
    <AppField label="Куда" for-id="transfer-rule-to" required>
      <AppSelect id="transfer-rule-to" v-model="toId" required>
        <option
          v-for="account in accounts.items.filter((item) => item.id !== fromId)"
          :key="'to-' + account.id"
          :value="account.id"
        >
          {{ account.name }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="transfer-rule-title">
      <AppInput id="transfer-rule-title" v-model="title" placeholder="На карту" />
    </AppField>
    <AppField label="Сумма, ₽" for-id="transfer-rule-amount" required>
      <AppInputNumber id="transfer-rule-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="Частота" for-id="transfer-rule-frequency" required>
      <AppSelect id="transfer-rule-frequency" v-model="frequency">
        <option value="monthly">Ежемесячно</option>
        <option value="weekly">Еженедельно</option>
        <option value="biweekly">Раз в две недели</option>
      </AppSelect>
    </AppField>
    <AppField
      v-if="frequency === 'monthly'"
      label="День месяца"
      for-id="transfer-rule-month-day"
      hint="До 28-го числа, чтобы дата была в каждом месяце"
      required
    >
      <AppInput
        id="transfer-rule-month-day"
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
      for-id="transfer-rule-weekday"
      required
    >
      <AppSelect id="transfer-rule-weekday" v-model="weekday">
        <option v-for="day in WEEKDAYS" :key="day.value" :value="day.value">
          {{ day.label }}
        </option>
      </AppSelect>
    </AppField>
    <AppField
      v-if="frequency === 'biweekly'"
      label="Первая дата перевода"
      for-id="transfer-rule-anchor"
      hint="Дальше перевод будет повторяться каждые две недели"
      required
    >
      <AppInput id="transfer-rule-anchor" v-model="anchorDate" type="date" required />
    </AppField>
    <AppField
      label="С даты"
      for-id="transfer-rule-starts-on"
      hint="Платежи раньше этой даты не проводятся и не показываются в плане"
      required
    >
      <AppInput id="transfer-rule-starts-on" v-model="startsOn" type="date" required />
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
