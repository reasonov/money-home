<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AppEmpty,
  AppField,
  AppInput,
  AppSegmented,
  AppSelect,
  formatMoney,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  averageDailyExpense,
  expensesByWeekday,
  expenseShare,
  filterStatsTransactions,
  heatmapWeeks,
  periodDayCount,
  previousStatsDateRange,
  statsDateRange,
  statsSummary,
  topTransactions,
  totalsByAccount,
  totalsByCategory,
  trendSeries,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import {
  AccountSpendChart,
  CategorySpendChart,
  HeatmapChart,
  TopOperationsList,
  TrendChart,
  WeekdaySpendChart,
} from '@/widgets/stats-charts'

type StatsChartId = 'category' | 'weekday' | 'heatmap' | 'trend' | 'top' | 'accounts'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

const period = ref<ChartPeriod>('month')
const chart = ref<StatsChartId>('category')
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

watch(selectedAccountId, (id) => {
  if (id !== ALL_ACCOUNTS_ID && chart.value === 'accounts') {
    chart.value = 'category'
  }
})

const customRange = computed(() => ({
  from: customFrom.value,
  to: customTo.value,
}))

const filtered = computed(() =>
  filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: period.value,
    from: customFrom.value,
    to: customTo.value,
  }),
)

const range = computed(() => statsDateRange(period.value, undefined, customRange.value))
const summary = computed(() => statsSummary(filtered.value))
const previousRange = computed(() =>
  previousStatsDateRange(period.value, undefined, customRange.value),
)
const previousSummary = computed(() => {
  const prev = previousRange.value
  if (!prev?.from || !prev.to) {
    return null
  }
  return statsSummary(
    filterStatsTransactions(transactions.posted, {
      accountId: selectedAccountId.value,
      period: 'custom',
      from: prev.from,
      to: prev.to,
    }),
  )
})

const dayCount = computed(() => periodDayCount(range.value, undefined, filtered.value))
const dailyExpense = computed(() => averageDailyExpense(summary.value.expenseTotal, dayCount.value))
const share = computed(() => expenseShare(summary.value.expenseTotal, summary.value.incomeTotal))

const categorySlices = computed(() => totalsByCategory(filtered.value, kind.value))
const weekdaySlices = computed(() => expensesByWeekday(filtered.value))
const heatmap = computed(() => heatmapWeeks(filtered.value, range.value))
const trendSlices = computed(() => trendSeries(filtered.value, range.value))
const topItems = computed(() => topTransactions(filtered.value, kind.value))
const accountSlices = computed(() =>
  totalsByAccount(filtered.value).map((item) => ({
    ...item,
    name: accounts.getById(item.accountId)?.name ?? 'Счёт',
  })),
)

const hasWeekdayExpenses = computed(() => weekdaySlices.value.some((item) => item.amount > 0))
const showKind = computed(() => chart.value === 'category' || chart.value === 'top')
const chartTitle = computed(() =>
  kind.value === 'expense' ? 'Расходы по категориям' : 'Доходы по категориям',
)
const centerLabel = computed(() => (kind.value === 'expense' ? 'Потрачено' : 'Получено'))
const kindEmpty = computed(() =>
  kind.value === 'expense' ? 'Нет расходов за период' : 'Нет доходов за период',
)

function formatShare(value: number | null) {
  if (value == null) {
    return '—'
  }
  return `${Math.round(value * 100)}%`
}

function formatDelta(current: number, previous: number) {
  const delta = current - previous
  if (delta === 0) {
    return 'как раньше'
  }
  return `${delta > 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`
}

function deltaClass(current: number, previous: number, invert = false) {
  const delta = current - previous
  if (delta === 0) {
    return ''
  }
  const better = invert ? delta < 0 : delta > 0
  return better ? 'is-in' : 'is-out'
}
</script>

<template>
  <div class="stats">
    <div class="filters">
      <AppSegmented v-model="period" :options="periodOptions" aria-label="Период" />

      <div v-if="period === 'custom'" class="range">
        <AppField label="С" for-id="stats-from">
          <AppInput id="stats-from" v-model="customFrom" type="date" />
        </AppField>
        <AppField label="По" for-id="stats-to">
          <AppInput id="stats-to" v-model="customTo" type="date" />
        </AppField>
      </div>

      <div data-tour="stats-chart">
        <AppField label="График" for-id="stats-chart">
          <AppSelect id="stats-chart" v-model="chart">
            <option value="category">По категориям</option>
            <option value="weekday">По дням недели</option>
            <option value="heatmap">Тепловая карта</option>
            <option value="trend">Динамика</option>
            <option value="top">Топ операций</option>
            <option v-if="selectedAccountId === ALL_ACCOUNTS_ID" value="accounts">По счетам</option>
          </AppSelect>
        </AppField>
      </div>
    </div>

    <AppEmpty v-if="!filtered.length" description="Нет операций за период" />

    <template v-else>
      <div class="kpis">
        <section class="summary" aria-label="Сводка">
          <div class="summary__item">
            <p class="summary__label">Расходы</p>
            <p class="summary__value is-out">{{ formatMoney(summary.expenseTotal) }}</p>
            <p
              v-if="previousSummary"
              class="summary__delta"
              :class="deltaClass(summary.expenseTotal, previousSummary.expenseTotal, true)"
            >
              {{ formatDelta(summary.expenseTotal, previousSummary.expenseTotal) }}
            </p>
          </div>
          <div class="summary__item">
            <p class="summary__label">Доходы</p>
            <p class="summary__value is-in">{{ formatMoney(summary.incomeTotal) }}</p>
            <p
              v-if="previousSummary"
              class="summary__delta"
              :class="deltaClass(summary.incomeTotal, previousSummary.incomeTotal)"
            >
              {{ formatDelta(summary.incomeTotal, previousSummary.incomeTotal) }}
            </p>
          </div>
          <div class="summary__item">
            <p class="summary__label">Разница</p>
            <p class="summary__value" :class="summary.net >= 0 ? 'is-in' : 'is-out'">
              {{ formatMoney(summary.net) }}
            </p>
            <p
              v-if="previousSummary"
              class="summary__delta"
              :class="deltaClass(summary.net, previousSummary.net)"
            >
              {{ formatDelta(summary.net, previousSummary.net) }}
            </p>
          </div>
        </section>

        <section class="summary summary--rates" aria-label="Средние">
          <div class="summary__item">
            <p class="summary__label">Средний расход в день</p>
            <p class="summary__value">{{ formatMoney(dailyExpense) }}</p>
          </div>
          <div class="summary__item">
            <p class="summary__label">Доля доходов на расходы</p>
            <p class="summary__value">{{ formatShare(share) }}</p>
          </div>
        </section>
      </div>

      <AppSegmented
        v-if="showKind"
        v-model="kind"
        :options="kindOptions"
        aria-label="Тип операций"
      />

      <CategorySpendChart
        v-if="chart === 'category' && categorySlices.length"
        :slices="categorySlices"
        :title="chartTitle"
        :center-label="centerLabel"
      />
      <AppEmpty v-else-if="chart === 'category'" :description="kindEmpty" />

      <WeekdaySpendChart
        v-else-if="chart === 'weekday' && hasWeekdayExpenses"
        :slices="weekdaySlices"
      />
      <AppEmpty v-else-if="chart === 'weekday'" description="Нет расходов за период" />

      <HeatmapChart
        v-else-if="chart === 'heatmap'"
        :weeks="heatmap.weeks"
        :capped="heatmap.capped"
      />

      <TrendChart v-else-if="chart === 'trend'" :slices="trendSlices" />

      <TopOperationsList v-else-if="chart === 'top' && topItems.length" :items="topItems" />
      <AppEmpty v-else-if="chart === 'top'" :description="kindEmpty" />

      <AccountSpendChart
        v-else-if="chart === 'accounts' && accountSlices.length"
        :slices="accountSlices"
      />
      <AppEmpty v-else-if="chart === 'accounts'" description="Нет операций за период" />
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filters,
.range {
  display: grid;
  gap: var(--space-3);
}

.range {
  grid-template-columns: 1fr 1fr;
}

.kpis {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.summary--rates {
  grid-template-columns: 1fr 1fr;
}

.summary__label {
  margin-bottom: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.summary__value {
  font-size: 0.9375rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.summary__delta {
  margin-top: 2px;
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}
</style>
