<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus } from '@lucide/vue'
import {
  AppButton,
  AppEmpty,
  AppField,
  AppInput,
  AppSegmented,
  formatMoney,
  openFormDrawer,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  filterStatsTransactions,
  statsDateRange,
  totalsByCategory,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import { CategorySpendChart } from '@/widgets/stats-charts'
import { TransactionList } from '@/widgets/transaction-list'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

const period = ref<ChartPeriod>('month')
const kind = ref<'expense' | 'income'>('expense')
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())

const periodOptions: { value: ChartPeriod; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'custom', label: 'Период' },
]

const kindOptions: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

watch(period, (value) => {
  if (value === 'custom' && !customFrom.value) {
    customFrom.value = todayLocal().slice(0, 8) + '01'
    customTo.value = todayLocal()
  }
})

const filtered = computed(() =>
  filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: period.value,
    from: customFrom.value,
    to: customTo.value,
  }),
)

const periodItems = computed(() => {
  const range = statsDateRange(period.value, undefined, {
    from: customFrom.value,
    to: customTo.value,
  })
  return transactions.posted.filter((item) => {
    if (
      selectedAccountId.value !== ALL_ACCOUNTS_ID &&
      item.accountId !== selectedAccountId.value &&
      item.counterpartyAccountId !== selectedAccountId.value
    ) {
      return false
    }
    if (range.from && item.occurredOn < range.from) {
      return false
    }
    if (range.to && item.occurredOn > range.to) {
      return false
    }
    return true
  })
})

const slices = computed(() => totalsByCategory(filtered.value, kind.value))
const chartTitle = computed(() =>
  kind.value === 'expense' ? 'Расходы по категориям' : 'Доходы по категориям',
)
const centerLabel = computed(() => (kind.value === 'expense' ? 'Потрачено' : 'Получено'))
const emptyText = computed(() =>
  kind.value === 'expense' ? 'Нет расходов за период' : 'Нет доходов за период',
)
const totalLabel = computed(() =>
  selectedAccountId.value === ALL_ACCOUNTS_ID
    ? 'Всего на счетах'
    : (accounts.selectedAccount?.name ?? 'Счёт'),
)
</script>

<template>
  <div class="home">
    <AppEmpty v-if="!accounts.items.length" description="Пока нет счетов">
      <div class="empty-actions">
        <div data-tour="home-accounts">
          <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
        </div>
        <AppButton variant="secondary" block @click="openFormDrawer({ name: 'account', mode: 'join' })">
          Ввести код
        </AppButton>
      </div>
    </AppEmpty>

    <template v-else>
      <section class="hero">
        <p class="hero__label">{{ totalLabel }}</p>
        <p class="hero__total">{{ formatMoney(accounts.displayedTotal) }}</p>
      </section>

      <div class="cta">
        <div data-tour="cta-expense">
          <AppButton block @click="openFormDrawer({ name: 'expense' })">
            <template #icon>
              <Plus :size="18" :stroke-width="2" />
            </template>
            Расход
          </AppButton>
        </div>
        <div data-tour="cta-income">
          <AppButton variant="secondary" block @click="openFormDrawer({ name: 'income' })">
            <template #icon>
              <Plus :size="18" :stroke-width="2" />
            </template>
            Доход
          </AppButton>
        </div>
      </div>

      <AppSegmented v-model="period" :options="periodOptions" aria-label="Период" />

      <div v-if="period === 'custom'" class="range">
        <AppField label="С" for-id="home-from">
          <AppInput id="home-from" v-model="customFrom" type="date" />
        </AppField>
        <AppField label="По" for-id="home-to">
          <AppInput id="home-to" v-model="customTo" type="date" />
        </AppField>
      </div>

      <AppSegmented v-model="kind" :options="kindOptions" aria-label="Тип операций" />

      <div class="home__split">
        <CategorySpendChart
          v-if="slices.length"
          :slices="slices"
          :title="chartTitle"
          :center-label="centerLabel"
        />
        <AppEmpty v-else :description="emptyText" />

        <TransactionList :items="periodItems" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hero {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.hero__label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.hero__total {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.cta,
.empty-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.empty-actions {
  width: min(100%, 280px);
  margin: 0 auto;
}

@media (orientation: landscape) and (max-height: 500px) {
  .home__split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    align-items: start;
  }
}
</style>
