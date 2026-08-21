<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AppBanner,
  AppButton,
  AppEmpty,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  confirmAction,
  formatMoney,
  getErrorMessage,
  openFormDrawer,
  todayLocal,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useSavingsGoalStore } from '@/entities/savings-goal'
import { useSessionStore } from '@/entities/session'
import { savingsPlanForAccount } from '../lib/savingsPlanForAccount'

const props = defineProps<{
  accountId?: string
  goalId?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const session = useSessionStore()
const accounts = useAccountStore()
const goals = useSavingsGoalStore()

const existing = props.goalId ? goals.getById(props.goalId) : undefined

const accountId = ref(
  existing?.accountId ?? accounts.getById(props.accountId ?? '')?.id ?? accounts.preferredAccountId,
)
const title = ref(existing?.title ?? '')
const amount = ref<string | number>(existing ? existing.targetAmount : '')
const targetDate = ref(existing?.targetDate ?? todayLocal())
const savedAmount = ref<string | number>(existing ? existing.savedAmount : 0)
const error = ref('')
const pending = ref(false)

const submitLabel = computed(() => {
  if (pending.value) {
    return existing ? 'Сохраняем…' : 'Добавляем…'
  }
  return existing ? 'Сохранить копилку' : 'Добавить копилку'
})

const draftAmount = computed(() => Number(amount.value))
const draftSaved = computed(() => Number(savedAmount.value))

const previewReady = computed(
  () =>
    Boolean(accountId.value) &&
    Number.isFinite(draftAmount.value) &&
    draftAmount.value > 0 &&
    Boolean(targetDate.value) &&
    Number.isFinite(draftSaved.value) &&
    draftSaved.value >= 0,
)

const plan = computed(() => {
  if (!previewReady.value) {
    return null
  }
  const others = goals
    .activeFor(accountId.value)
    .filter((item) => item.id !== existing?.id)
    .map((item) => ({
      id: item.id,
      title: item.title,
      targetAmount: item.targetAmount,
      targetDate: item.targetDate,
      savedAmount: item.savedAmount,
      startedOn: item.startedOn,
      status: item.status,
    }))
  return savingsPlanForAccount(accountId.value, [
    ...others,
    {
      ...(existing?.id ? { id: existing.id } : {}),
      title: title.value.trim() || 'Копилка',
      targetAmount: draftAmount.value,
      targetDate: targetDate.value,
      savedAmount: draftSaved.value,
      startedOn: existing?.startedOn ?? todayLocal(),
    },
  ])
})

const thisGoalPlan = computed(() => {
  const current = plan.value
  if (!current) return null
  if (existing?.id) {
    return current.goals.find((item) => item.id === existing.id) ?? current.goals[current.goals.length - 1] ?? null
  }
  return current.goals.find((item) => !item.id) ?? current.goals[current.goals.length - 1] ?? null
})

async function onSubmit() {
  error.value = ''
  const userId = session.user?.id
  if (!userId) return
  if (!accountId.value) {
    error.value = 'Выберите счёт'
    return
  }
  const target = Number(amount.value)
  const saved = Number(savedAmount.value)
  if (!Number.isFinite(target) || target <= 0) {
    error.value = 'Укажите сумму цели больше 0 ₽'
    return
  }
  if (!targetDate.value) {
    error.value = 'Укажите дату'
    return
  }
  if (!Number.isFinite(saved) || saved < 0) {
    error.value = 'Укажите, сколько уже отложено'
    return
  }
  pending.value = true
  try {
    if (existing) {
      await goals.updateGoal(existing.id, userId, {
        title: title.value.trim() || 'Копилка',
        targetAmount: target,
        targetDate: targetDate.value,
        savedAmount: saved,
      })
    } else {
      await goals.addGoal({
        accountId: accountId.value,
        title: title.value.trim() || 'Копилка',
        targetAmount: target,
        targetDate: targetDate.value,
        savedAmount: saved,
        startedOn: todayLocal(),
        createdBy: userId,
      })
    }
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить копилку')
  } finally {
    pending.value = false
  }
}

async function complete() {
  const userId = session.user?.id
  if (!userId || !existing) return
  const ok = await confirmAction({
    title: 'Отметить достигнутой',
    message: 'Копилка исчезнет из списка. Деньги на счёте не изменятся.',
    confirmLabel: 'Завершить',
  })
  if (!ok) return
  pending.value = true
  try {
    await goals.completeGoal(existing.id, userId)
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось завершить копилку')
  } finally {
    pending.value = false
  }
}

async function remove() {
  const userId = session.user?.id
  if (!userId || !existing) return
  const ok = await confirmAction({
    title: 'Удалить копилку',
    message: 'Цель будет удалена. Деньги на счёте не изменятся.',
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) return
  pending.value = true
  try {
    await goals.removeGoal(existing.id, userId)
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить копилку')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppEmpty v-if="!accounts.items.length" description="Сначала создайте счёт">
    <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
  </AppEmpty>

  <form v-else class="form" @submit.prevent="onSubmit">
    <AppField v-if="!existing" label="Счёт" for-id="savings-account">
      <AppSelect id="savings-account" v-model="accountId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="savings-title">
      <AppInput id="savings-title" v-model="title" placeholder="Отпуск" />
    </AppField>
    <AppField label="Сумма цели, ₽" for-id="savings-amount">
      <AppInputNumber id="savings-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="К какой дате" for-id="savings-date">
      <AppInput id="savings-date" v-model="targetDate" type="date" required />
    </AppField>
    <AppField
      label="Уже отложено, ₽"
      for-id="savings-saved"
      hint="Метка на деньгах счёта, не перевод"
    >
      <AppInputNumber id="savings-saved" v-model="savedAmount" :min="0" placeholder="0" />
    </AppField>

    <AppBanner v-if="plan?.overAllocated" variant="warning">
      На копилках отмечено больше, чем есть на счёте
    </AppBanner>
    <AppBanner v-if="plan" :variant="plan.extraPerMonth <= 0 ? 'success' : 'warning'">
      {{ plan.message }}
    </AppBanner>
    <ul v-if="plan" class="breakdown">
      <li>Средний доход: {{ formatMoney(plan.avgMonthlyManualIncome) }}/мес</li>
      <li>Средний расход: {{ formatMoney(plan.avgMonthlyManualExpense) }}/мес</li>
      <li v-if="plan.historyDays === 0">
        Регулярные пополнения: {{ formatMoney(plan.incomeRuleTotal) }}
      </li>
      <li v-if="plan.historyDays === 0">
        Регулярные расходы: {{ formatMoney(plan.expenseRuleTotal) }}
      </li>
      <li>Плановые покупки: {{ formatMoney(plan.plannedSpend) }}</li>
      <li v-if="thisGoalPlan">{{ thisGoalPlan.message }}</li>
    </ul>

    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">{{ submitLabel }}</AppButton>
    <AppButton v-if="existing" variant="secondary" block :disabled="pending" @click="complete">
      Отметить достигнутой
    </AppButton>
    <AppButton v-if="existing" variant="danger" block :disabled="pending" @click="remove">
      Удалить
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.breakdown {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.form__error {
  color: var(--color-warning);
}
</style>
