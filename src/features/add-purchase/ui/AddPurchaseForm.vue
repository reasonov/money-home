<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AppBanner,
  AppButton,
  AppDrawer,
  AppField,
  AppInput,
  AppTextarea,
  compareDates,
  formatLocalDate,
  formatMoney,
  formatProjectionDate,
  parseLocalDate,
  getErrorMessage,
  projectBalance,
  todayLocal,
} from '@/shared'
import { useBalanceStore } from '@/entities/balance'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()
const balance = useBalanceStore()
const incomeRules = useIncomeRuleStore()
const purchases = usePurchaseStore()

const title = ref('')
const amount = ref('')
const plannedDate = ref(todayLocal())
const notes = ref('')
const error = ref('')
const detailsOpen = ref(false)
const pending = ref(false)

const projection = computed(() => {
  const candidateAmount = Number(amount.value)
  if (!Number.isFinite(candidateAmount) || candidateAmount <= 0 || !plannedDate.value) {
    return null
  }

  const asOf = parseLocalDate(todayLocal())
  const target = parseLocalDate(plannedDate.value)
  if (compareDates(target, asOf) < 0) {
    return null
  }

  return projectBalance({
    currentBalance: balance.amount,
    asOfDate: asOf,
    targetDate: target,
    incomeRules: incomeRules.active.map((rule) => ({
      amount: rule.amount,
      frequency: rule.frequency,
      weekday: rule.weekday,
      monthDay: rule.monthDay,
      anchorDate: rule.anchorDate,
      active: rule.active,
    })),
    plannedPurchases: purchases.planned.map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount,
      plannedDate: item.plannedDate,
      status: item.status,
    })),
    candidateAmount,
  })
})

const candidateAmountValue = computed(() => Number(amount.value))

function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few
  }
  return many
}

function openDetails() {
  detailsOpen.value = true
}

function applyAffordableDate() {
  const next = projection.value?.nextAffordableDate
  if (!next) {
    return
  }
  plannedDate.value = formatLocalDate(next)
  error.value = ''
  detailsOpen.value = false
}

function applyProjectedAmount() {
  const projected = projection.value?.projectedBalance
  if (!projected || projected <= 0) {
    return
  }
  amount.value = String(Math.floor(projected))
  error.value = ''
  detailsOpen.value = false
}

function goIncome() {
  detailsOpen.value = false
  void router.push('/income')
}

async function onSubmit() {
  error.value = ''
  const candidateAmount = Number(amount.value)
  if (!title.value.trim() || !Number.isFinite(candidateAmount) || candidateAmount <= 0) {
    error.value = 'Укажите название и сумму'
    return
  }

  const asOf = parseLocalDate(todayLocal())
  const target = parseLocalDate(plannedDate.value)
  if (compareDates(target, asOf) < 0) {
    error.value = 'Дата не может быть раньше сегодня'
    return
  }

  const result = projection.value
  if (!result) {
    error.value = 'Проверьте сумму и дату'
    return
  }

  if (!result.canAfford) {
    error.value = 'К выбранной дате денег не хватает — посмотрите детали'
    openDetails()
    return
  }

  const userId = session.user?.id
  if (!userId) {
    return
  }

  pending.value = true
  try {
    await purchases.addPurchase({
      title: title.value,
      amount: candidateAmount,
      plannedDate: plannedDate.value,
      notes: notes.value,
      createdBy: userId,
    })
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить покупку')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <button type="button" class="form__back" @click="router.push('/')">← Назад к плану</button>
    <AppField label="Что купить" for-id="purchase-title">
      <AppInput id="purchase-title" v-model="title" placeholder="Штора" required />
    </AppField>
    <AppField label="Сумма, ₽" for-id="purchase-amount">
      <AppInput
        id="purchase-amount"
        v-model="amount"
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        required
      />
    </AppField>
    <AppField label="Дата покупки" for-id="purchase-date">
      <AppInput id="purchase-date" v-model="plannedDate" type="date" required />
    </AppField>
    <AppField
      label="Описание"
      for-id="purchase-notes"
      hint="Необязательно. Можно перечислить позиции заказа"
    >
      <AppTextarea
        id="purchase-notes"
        v-model="notes"
        placeholder="Заказ с ВБ. 1. Штора, 2. Стул, 3. Стол"
        :rows="4"
      />
    </AppField>

    <AppBanner v-if="projection?.canAfford" variant="success">
      Хватит — к дате на счету будет
      <span class="money">{{ formatMoney(projection.projectedBalance) }}</span>
    </AppBanner>
    <AppBanner v-else-if="projection && !projection.canAfford" variant="warning">
      <p class="banner-text">{{ projection.message }}</p>
      <button type="button" class="banner-link" @click="openDetails">Подробнее</button>
    </AppBanner>

    <p
      v-if="error && projection?.canAfford !== false"
      class="form__error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="error && projection && !projection.canAfford"
      class="form__error"
      role="alert"
    >
      {{ error }}
    </p>

    <AppButton
      type="submit"
      block
      :disabled="pending || Boolean(projection && !projection.canAfford)"
    >
      {{ pending ? 'Сохраняем…' : 'Добавить покупку' }}
    </AppButton>
  </form>

  <AppDrawer v-model:open="detailsOpen" title="Не хватает денег к выбранной дате">
    <div v-if="projection && !projection.canAfford" class="details">
      <p class="details__lead">
        К дате на счету будет
        <span class="money">{{ formatMoney(projection.projectedBalance) }}</span>
        — не хватает
        <span class="money">{{ formatMoney(projection.shortfall) }}</span>
        на покупку
        <span class="money">{{ formatMoney(candidateAmountValue) }}</span>.
      </p>

      <section class="details__section">
        <h3 class="details__heading">Уже в плане до этой даты</h3>
        <ul v-if="projection.plannedBeforeTarget.length" class="details__list">
          <li
            v-for="item in projection.plannedBeforeTarget"
            :key="`${item.plannedDate}-${item.title}`"
          >
            <span>{{ item.title }}</span>
            <span class="money">{{ formatMoney(item.amount) }}</span>
          </li>
        </ul>
        <p v-else class="details__muted">Других покупок до этой даты нет</p>
      </section>

      <section class="details__section">
        <h3 class="details__heading">Ожидаемые пополнения</h3>
        <p v-if="projection.incomeOccurrencesCount > 0">
          {{ formatMoney(projection.incomeTotal) }}
          ({{ projection.incomeOccurrencesCount }}
          {{
            pluralizeRu(
              projection.incomeOccurrencesCount,
              'начисление',
              'начисления',
              'начислений',
            )
          }})
        </p>
        <template v-else>
          <p class="details__muted">Пополнений до этой даты не ожидается</p>
          <AppButton type="button" variant="secondary" block @click="goIncome">
            Настроить пополнения
          </AppButton>
        </template>
      </section>

      <section class="details__section">
        <h3 class="details__heading">Когда хватит</h3>
        <p v-if="projection.nextAffordableDate">
          Ближайшая дата, когда хватит:
          <strong>{{ formatProjectionDate(projection.nextAffordableDate) }}</strong>
        </p>
        <p v-else class="details__muted">
          В ближайший год подходящей даты нет — измените сумму, дату или правила пополнения
        </p>
      </section>

      <div class="details__actions">
        <AppButton
          v-if="projection.nextAffordableDate"
          type="button"
          block
          @click="applyAffordableDate"
        >
          Поставить на эту дату
        </AppButton>
        <AppButton
          v-if="projection.projectedBalance > 0"
          type="button"
          variant="secondary"
          block
          @click="applyProjectedAmount"
        >
          Уменьшить сумму до {{ formatMoney(Math.floor(projection.projectedBalance)) }}
        </AppButton>
        <AppButton type="button" variant="ghost" block @click="detailsOpen = false">
          Понятно
        </AppButton>
      </div>
    </div>
  </AppDrawer>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__back {
  align-self: flex-start;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
  font-weight: 600;
}

.banner-text {
  margin: 0;
}

.banner-link {
  margin-top: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.money {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.details {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.details__lead {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text);
}

.details__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.details__heading {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.details__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.details__list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  line-height: 1.4;
}

.details__muted {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.details__section p {
  margin: 0;
  line-height: 1.45;
}

.details__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
