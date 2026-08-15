<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, Plus } from '@lucide/vue'
import { RouterLink } from 'vue-router'
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
  totalsByCategory,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import { InstallHint } from '@/features/install-pwa'
import { CategorySpendChart } from '@/widgets/stats-charts'

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
    <InstallHint />

    <AppEmpty v-if="!accounts.items.length" description="Пока нет счетов">
      <div class="empty-actions" data-tour="home-create">
        <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
        <AppButton
          variant="secondary"
          block
          @click="openFormDrawer({ name: 'account', mode: 'join' })"
        >
          Ввести код
        </AppButton>
      </div>
    </AppEmpty>

    <template v-else>
      <section class="hero" data-tour="home-balance">
        <p class="hero__label">{{ totalLabel }}</p>
        <p class="hero__total">{{ formatMoney(accounts.displayedTotal) }}</p>
      </section>

      <div class="cta" data-tour="home-cta">
        <AppButton block @click="openFormDrawer({ name: 'expense' })">
          <template #icon>
            <Plus :size="18" :stroke-width="2" />
          </template>
          Расход
        </AppButton>
        <AppButton variant="secondary" block @click="openFormDrawer({ name: 'income' })">
          <template #icon>
            <Plus :size="18" :stroke-width="2" />
          </template>
          Доход
        </AppButton>
      </div>

      <div class="home__chart" data-tour="home-chart">
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

        <CategorySpendChart
          v-if="slices.length"
          :slices="slices"
          :title="chartTitle"
          :center-label="centerLabel"
        />
        <AppEmpty v-else :description="emptyText" />
      </div>

      <RouterLink class="history-link" to="/history" aria-label="Открыть историю операций">
        <span class="history-link__text">
          <span class="history-link__title">История операций</span>
          <span class="history-link__hint">Расходы, доходы и переводы</span>
        </span>
        <span class="history-link__action">
          Открыть
          <ChevronRight :size="18" :stroke-width="1.8" />
        </span>
      </RouterLink>
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

.home__chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.empty-actions {
  width: min(100%, 280px);
  margin: 0 auto;
}

.history-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 44px;
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  text-decoration: none;
  color: inherit;
}

.history-link:hover {
  text-decoration: none;
}

.history-link__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.history-link__title {
  font-size: 1.125rem;
  font-weight: 700;
}

.history-link__hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.history-link__action {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-accent);
}
</style>
