<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AppEmpty,
  AppPeriodSelect,
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
  formatPeriodLabel,
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

const kindOptions: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const periodLabel = computed(() =>
  formatPeriodLabel(period.value, undefined, {
    from: customFrom.value,
    to: customTo.value,
  }),
)

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
    <div class="stats__toolbar">
      <div data-tour="stats-chart">
        <AppSelect id="stats-chart" v-model="chart" size="medium" aria-label="График">
          <option value="category">По категориям</option>
          <option value="weekday">По дням недели</option>
          <option value="heatmap">Тепловая карта</option>
          <option value="trend">Динамика</option>
          <option value="top">Топ операций</option>
          <option v-if="selectedAccountId === ALL_ACCOUNTS_ID" value="accounts">По счетам</option>
        </AppSelect>
      </div>
      <AppPeriodSelect
        v-model="period"
        v-model:from="customFrom"
        v-model:to="customTo"
        :label="periodLabel"
      />
    </div>

    <AppEmpty v-if="!filtered.length" description="Нет операций за период" />

    <template v-else>
      <section class="summary" aria-label="Сводка">
        <div class="summary__row">
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
        </div>
        <div class="summary__row summary__row--rates">
          <div class="summary__item">
            <p class="summary__label">Средний расход в день</p>
            <p class="summary__value">{{ formatMoney(dailyExpense) }}</p>
          </div>
          <div class="summary__item">
            <p class="summary__label">Доля доходов на расходы</p>
            <p class="summary__value">{{ formatShare(share) }}</p>
          </div>
        </div>
      </section>

      <section class="stats__chart">
        <AppSegmented
          v-if="showKind"
          v-model="kind"
          compact
          :options="kindOptions"
          aria-label="Тип операций"
        />

        <CategorySpendChart
          v-if="chart === 'category' && categorySlices.length"
          embedded
          :slices="categorySlices"
          :title="chartTitle"
          :center-label="centerLabel"
        />
        <AppEmpty v-else-if="chart === 'category'" :description="kindEmpty" />

        <WeekdaySpendChart
          v-else-if="chart === 'weekday' && hasWeekdayExpenses"
          embedded
          :slices="weekdaySlices"
        />
        <AppEmpty v-else-if="chart === 'weekday'" description="Нет расходов за период" />

        <HeatmapChart
          v-else-if="chart === 'heatmap'"
          embedded
          :weeks="heatmap.weeks"
          :capped="heatmap.capped"
        />

        <TrendChart v-else-if="chart === 'trend'" embedded :slices="trendSlices" />

        <TopOperationsList
          v-else-if="chart === 'top' && topItems.length"
          embedded
          :items="topItems"
        />
        <AppEmpty v-else-if="chart === 'top'" :description="kindEmpty" />

        <AccountSpendChart
          v-else-if="chart === 'accounts' && accountSlices.length"
          embedded
          :slices="accountSlices"
        />
        <AppEmpty v-else-if="chart === 'accounts'" description="Нет операций за период" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.stats__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9.75rem;
  align-items: center;
  gap: var(--space-2);
}

.stats__chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.summary__row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.summary__row--rates {
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
