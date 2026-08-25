<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAccountStore } from '@/entities/account'
import { CategorySelect, useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import {
  AppBanner,
  AppButton,
  AppDrawer,
  AppEmpty,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  AppTextarea,
  compareDates,
  floorMoney,
  formatLocalDate,
  formatMoney,
  formatProjectionDate,
  parseLocalDate,
  getErrorMessage,
  openFormDrawer,
  projectBalance,
  suggestTransfer,
  todayLocal,
  track,
  transferProjectionForAccount,
} from '@/shared'

const props = defineProps<{
  plannedDate?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const session = useSessionStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const purchases = usePurchaseStore()
const transactions = useTransactionStore()

const title = ref('')
const amount = ref<string | number>('')
const plannedDate = ref(props.plannedDate ?? '')
const notes = ref('')
const accountId = ref(accounts.preferredAccountId)
const categoryId = ref('')
const error = ref('')
const detailsOpen = ref(false)
const pending = ref(false)
const transferring = ref(false)

watch(
  () => categories.forAccount(accountId.value, 'expense').map((item) => item.id).join(),
  () => {
    const list = categories.forAccount(accountId.value, 'expense')
    if (!list.some((item) => item.id === categoryId.value)) {
      categoryId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

function resolvedDate() {
  const value = plannedDate.value.trim()
  return value || undefined
}

const projection = computed(() => {
  const candidateAmount = Number(amount.value)
  const date = resolvedDate()
  if (!Number.isFinite(candidateAmount) || candidateAmount <= 0 || !date) {
    return null
  }

  const asOf = parseLocalDate(todayLocal())
  const target = parseLocalDate(date)
  if (compareDates(target, asOf) < 0) {
    return null
  }

  return projectBalance({
    currentBalance: accounts.getById(accountId.value)?.amount ?? 0,
    asOfDate: asOf,
    targetDate: target,
    incomeRules: incomeRules.forAccount(accountId.value).filter((rule) => rule.active),
    expenseRules: expenseRules.forAccount(accountId.value).filter((rule) => rule.active),
    plannedPurchases: purchases.plannedFor(accountId.value),
    candidateAmount,
    postedOccurrenceDates: incomeRules
      .forAccount(accountId.value)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    postedExpenseOccurrenceDates: expenseRules
      .forAccount(accountId.value)
      .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
    ...transferProjectionForAccount(
      transferRules.items,
      accountId.value,
      (id) => transactions.transferOccurrenceDatesFor(id),
    ),
  })
})

const transferSuggestion = computed(() => {
  const result = projection.value
  const date = resolvedDate()
  if (!result || result.canAfford || !date) return null
  const asOf = parseLocalDate(todayLocal())
  const target = parseLocalDate(date)
  return suggestTransfer(
    result.shortfall,
    asOf,
    target,
    accounts.items
      .filter((item) => item.id !== accountId.value)
      .map((item) => ({
        id: item.id,
        name: item.name,
        currentBalance: item.amount,
        plannedPurchases: purchases.plannedFor(item.id),
        incomeRules: incomeRules.forAccount(item.id).filter((rule) => rule.active),
        expenseRules: expenseRules.forAccount(item.id).filter((rule) => rule.active),
        postedOccurrenceDates: incomeRules
          .forAccount(item.id)
          .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
        postedExpenseOccurrenceDates: expenseRules
          .forAccount(item.id)
          .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
        ...transferProjectionForAccount(
          transferRules.items,
          item.id,
          (id) => transactions.transferOccurrenceDatesFor(id),
        ),
      })),
  )
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
  track('purchase_projection_refused')
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
  amount.value = String(floorMoney(projected))
  error.value = ''
  detailsOpen.value = false
}

function goIncome() {
  detailsOpen.value = false
  openFormDrawer({ name: 'income-rule' })
}

async function applyTransfer() {
  const suggestion = transferSuggestion.value
  const userId = session.user?.id
  if (!suggestion || !userId || !accountId.value) return
  transferring.value = true
  error.value = ''
  try {
    await accounts.transfer({
      fromAccountId: suggestion.accountId,
      toAccountId: accountId.value,
      amount: suggestion.amount,
      occurredOn: todayLocal(),
    })
    track('transfer_suggestion_clicked', { outcome: 'done' })
    detailsOpen.value = false
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось перевести')
  } finally {
    transferring.value = false
  }
}

async function onSubmit() {
  error.value = ''
  const candidateAmount = Number(amount.value)
  if (!title.value.trim() || !Number.isFinite(candidateAmount) || candidateAmount <= 0) {
    error.value = 'Укажите название и сумму больше 0 ₽'
    return
  }

  const date = resolvedDate()
  if (date) {
    const asOf = parseLocalDate(todayLocal())
    const target = parseLocalDate(date)
    if (compareDates(target, asOf) < 0) {
      error.value = 'Дата не может быть раньше сегодня'
      return
    }

    const result = projection.value
    if (!result) {
      error.value = 'Укажите корректные сумму и дату покупки'
      return
    }

    if (!result.canAfford) {
      error.value = 'К выбранной дате на покупку не хватит денег. Посмотрите варианты ниже.'
      openDetails()
      return
    }
  }

  const userId = session.user?.id
  if (!userId) {
    return
  }

  const category = categories.getById(categoryId.value)
  if (!accountId.value || !category) {
    error.value = 'Выберите счёт и категорию'
    return
  }

  pending.value = true
  try {
    await purchases.addPurchase({
      accountId: accountId.value,
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      title: title.value,
      amount: candidateAmount,
      ...(date ? { plannedDate: date } : {}),
      notes: notes.value,
      createdBy: userId,
    })
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить покупку')
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
    <AppField label="Сумма, ₽" for-id="purchase-amount" required>
      <AppInputNumber id="purchase-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="Что купить" for-id="purchase-title" required>
      <AppInput id="purchase-title" v-model="title" placeholder="Штора" required />
    </AppField>
    <AppField label="Счёт списания" for-id="purchase-account" required>
      <AppSelect id="purchase-account" v-model="accountId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Категория" for-id="purchase-cat" required>
      <CategorySelect
        id="purchase-cat"
        v-model="categoryId"
        :categories="categories.forAccount(accountId, 'expense')"
        required
      />
    </AppField>
    <AppEmpty
      v-if="!categories.forAccount(accountId, 'expense').length"
      description="Нет категорий расхода для этого счёта"
    >
      <RouterLink to="/categories" custom v-slot="{ navigate }">
        <AppButton variant="secondary" block @click="navigate">Добавить категорию</AppButton>
      </RouterLink>
    </AppEmpty>
    <AppField
      label="Дата покупки"
      for-id="purchase-date"
      hint="Необязательно. Без даты попадёт в список на будущее"
    >
      <AppInput id="purchase-date" v-model="plannedDate" type="date" clearable />
    </AppField>
    <AppField
      label="Комментарий"
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
      На покупку хватит: к этой дате на счёте будет
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
      :disabled="pending || Boolean(projection && !projection.canAfford) || !categories.forAccount(accountId, 'expense').length"
    >
      {{ pending ? 'Сохраняем…' : 'Добавить покупку' }}
    </AppButton>
  </form>

  <AppDrawer v-model:open="detailsOpen" title="Не хватает денег к выбранной дате">
    <div v-if="projection && !projection.canAfford" class="details">
      <p class="details__lead">
        К этой дате на счёте будет
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
              'пополнение',
              'пополнения',
              'пополнений',
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
          v-if="transferSuggestion"
          type="button"
          block
          :disabled="transferring"
          @click="applyTransfer"
        >
          {{
            transferring
              ? 'Переводим…'
              : `Перевести ${formatMoney(transferSuggestion.amount)} со счёта «${transferSuggestion.accountName}»`
          }}
        </AppButton>
        <AppButton
          v-if="projection.nextAffordableDate"
          type="button"
          block
          @click="applyAffordableDate"
        >
          Перенести на {{ formatProjectionDate(projection.nextAffordableDate) }}
        </AppButton>
        <AppButton
          v-if="projection.projectedBalance > 0"
          type="button"
          variant="secondary"
          block
          @click="applyProjectedAmount"
        >
          Изменить сумму покупки на {{ formatMoney(floorMoney(projection.projectedBalance)) }}
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
