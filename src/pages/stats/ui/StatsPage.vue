<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
  AppButton,
  AppDrawer,
  AppEmpty,
  AppPeriodSelect,
  AppSegmented,
  AppSelect,
  forecastBalanceSeries,
  formatMoney,
  parseLocalDate,
  todayLocal,
  track,
  transferProjectionForAccount,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import {
  averageDailyExpense,
  canShiftChartPeriod,
  expensesByWeekday,
  expenseShare,
  filterStatsTransactions,
  formatPeriodLabel,
  heatmapWeeks,
  periodDayCount,
  previousStatsDateRange,
  rollupCategorySlices,
  shiftChartPeriod,
  statsDateRange,
  statsSummary,
  topTransactions,
  totalsByAccount,
  totalsByMember,
  trendSeries,
  useTransactionStore,
  type ChartPeriod,
  type CategorySpendSlice,
} from '@/entities/transaction'
import {
  AccountSpendChart,
  CategorySpendChart,
  ForecastChart,
  HeatmapChart,
  TopOperationsList,
  TrendChart,
  WeekdaySpendChart,
} from '@/widgets/stats-charts'
import {
  StatsInsightPanel,
  buildInsightCategories,
  buildInsightLevers,
  forecastMinBalance,
  type InsightChartId,
  type StatsInsightSummary,
} from '@/features/stats-insight'

type StatsChartId = 'category' | 'weekday' | 'heatmap' | 'trend' | 'top' | 'accounts' | 'members' | 'forecast'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()
const categories = useCategoryStore()
const router = useRouter()
const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const purchases = usePurchaseStore()

const period = ref<ChartPeriod>('month')
const chart = ref<StatsChartId>('category')
const kind = ref<'expense' | 'income'>('expense')
const forecastHorizon = ref<'30' | '90'>('30')
const asOf = ref(todayLocal())
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())
const insightOpen = ref(false)
const drillGroupId = ref<string | null>(null)

watch(insightOpen, (open) => {
  if (open) {
    track('stats_advice_opened')
  }
})

const kindOptions: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const periodLabel = computed(() =>
  formatPeriodLabel(period.value, asOf.value, {
    from: customFrom.value,
    to: customTo.value,
  }),
)

watch(selectedAccountId, (id) => {
  drillGroupId.value = null
  if (id !== ALL_ACCOUNTS_ID && chart.value === 'accounts') {
    chart.value = 'category'
  }
  if (id !== ALL_ACCOUNTS_ID && !accounts.isShared(id) && chart.value === 'members') {
    chart.value = 'category'
  }
})

watch([kind, period, chart], () => {
  drillGroupId.value = null
})

const customRange = computed(() => ({
  from: customFrom.value,
  to: customTo.value,
}))

const canShiftNext = computed(() =>
  canShiftChartPeriod(period.value, asOf.value, 1, customRange.value),
)

function onPeriodShift(delta: number) {
  const next = shiftChartPeriod(period.value, asOf.value, delta, customRange.value)
  asOf.value = next.asOf
  if (next.from) customFrom.value = next.from
  if (next.to) customTo.value = next.to
}

const filtered = computed(() =>
  filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: period.value,
    asOf: asOf.value,
    from: customFrom.value,
    to: customTo.value,
  }),
)

const range = computed(() => statsDateRange(period.value, asOf.value, customRange.value))
const summary = computed(() => statsSummary(filtered.value))
const previousRange = computed(() =>
  previousStatsDateRange(period.value, asOf.value, customRange.value),
)
const previousFiltered = computed(() => {
  const prev = previousRange.value
  if (!prev?.from || !prev.to) {
    return []
  }
  return filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: 'custom',
    from: prev.from,
    to: prev.to,
  })
})
const previousSummary = computed(() => {
  if (!previousRange.value?.from || !previousRange.value.to) {
    return null
  }
  return statsSummary(previousFiltered.value)
})

const dayCount = computed(() => periodDayCount(range.value, asOf.value, filtered.value))
const dailyExpense = computed(() => averageDailyExpense(summary.value.expenseTotal, dayCount.value))
const share = computed(() => expenseShare(summary.value.expenseTotal, summary.value.incomeTotal))

const categorySlices = computed(() =>
  rollupCategorySlices(
    filtered.value,
    kind.value,
    categories.items,
    categories.groups,
    drillGroupId.value,
  ),
)
const drillGroup = computed(() =>
  drillGroupId.value ? categories.getGroupById(drillGroupId.value) : null,
)
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

const showMembers = computed(
  () =>
    selectedAccountId.value === ALL_ACCOUNTS_ID || accounts.isShared(selectedAccountId.value),
)

const memberSlices = computed(() =>
  totalsByMember(filtered.value).map((item) => ({
    accountId: item.userId,
    name: accounts.memberName(item.userId),
    expenseTotal: item.expenseTotal,
    incomeTotal: item.incomeTotal,
  })),
)

function forecastSeries(horizonDays: number) {
  const asOf = parseLocalDate(todayLocal())
  const source =
    selectedAccountId.value === ALL_ACCOUNTS_ID
      ? accounts.items
      : accounts.items.filter((item) => item.id === selectedAccountId.value)
  const byDate = new Map<string, { date: string; label: string; balance: number }>()
  for (const account of source) {
    const series = forecastBalanceSeries({
      currentBalance: account.amount,
      asOfDate: asOf,
      horizonDays,
      incomeRules: incomeRules.forAccount(account.id).filter((rule) => rule.active),
      plannedPurchases: purchases.plannedFor(account.id),
      expenseRules: expenseRules.forAccount(account.id).filter((rule) => rule.active),
      postedOccurrenceDates: incomeRules
        .forAccount(account.id)
        .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
      postedExpenseOccurrenceDates: expenseRules
        .forAccount(account.id)
        .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
      ...transferProjectionForAccount(
        transferRules.items,
        account.id,
        (id) => transactions.transferOccurrenceDatesFor(id),
      ),
    })
    for (const slice of series) {
      const existing = byDate.get(slice.date)
      if (existing) {
        existing.balance += slice.balance
      } else {
        byDate.set(slice.date, { ...slice })
      }
    }
  }
  return [...byDate.values()]
}

const forecastSlices = computed(() => forecastSeries(forecastHorizon.value === '90' ? 90 : 30))

const insightForecastMin = computed(() => forecastMinBalance(forecastSeries(30)))

const insightScope = computed(() =>
  selectedAccountId.value === ALL_ACCOUNTS_ID ? 'по выбранным счетам' : 'на этом счёте',
)

function annotateInsightItem(item: (typeof filtered.value)[number]) {
  const cat = item.categoryId ? categories.getById(item.categoryId) : undefined
  const group = cat?.groupId ? categories.getGroupById(cat.groupId) : undefined
  return {
    kind: item.kind,
    amount: item.amount,
    ...(item.categoryId ? { categoryId: item.categoryId } : {}),
    ...(item.categoryName ? { categoryName: item.categoryName } : {}),
    ...(group ? { groupId: group.id, groupName: group.name } : {}),
  }
}

const insightSummary = computed((): StatsInsightSummary => {
  const hasPrevious = Boolean(previousRange.value?.from && previousRange.value.to)
  const levers = buildInsightLevers({
    period: period.value,
    hasPrevious,
    scopeLabel: insightScope.value,
    currentExpense: summary.value.expenseTotal,
    categories: buildInsightCategories(
      filtered.value.map(annotateInsightItem),
      previousFiltered.value.map(annotateInsightItem),
    ),
    topExpenses: topTransactions(filtered.value, 'expense', 3).map((item) => ({
      id: item.id,
      amount: item.amount,
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
      ...(item.categoryName ? { categoryName: item.categoryName } : {}),
      occurredOn: item.occurredOn,
    })),
    forecastMin: insightForecastMin.value,
  })
  return {
    accountId: selectedAccountId.value,
    period: period.value,
    periodLabel: periodLabel.value,
    scopeLabel: insightScope.value,
    ...(period.value === 'custom'
      ? { from: customFrom.value, to: customTo.value }
      : {}),
    hasPrevious,
    currentExpense: summary.value.expenseTotal,
    previousExpense: previousSummary.value?.expenseTotal ?? 0,
    currentIncome: summary.value.incomeTotal,
    previousIncome: previousSummary.value?.incomeTotal ?? 0,
    levers,
  }
})

const forecastHorizonOptions: { value: '30' | '90'; label: string }[] = [
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
]

const hasWeekdayExpenses = computed(() => weekdaySlices.value.some((item) => item.amount > 0))
const showKind = computed(() => chart.value === 'category' || chart.value === 'top')
const chartTitle = computed(() =>
  kind.value === 'expense' ? 'Расходы по категориям' : 'Доходы по категориям',
)
const centerLabel = computed(() => (kind.value === 'expense' ? 'Потрачено' : 'Получено'))
const kindEmpty = computed(() =>
  kind.value === 'expense' ? 'Нет расходов за период' : 'Нет доходов за период',
)

function openCategorySlice(slice: CategorySpendSlice) {
  if (slice.groupId && !drillGroupId.value) {
    drillGroupId.value = slice.groupId
    return
  }
  void router.push({
    name: 'history',
    query: {
      category: slice.categoryId ?? 'none',
      kind: kind.value,
      period: period.value,
      ...(period.value === 'custom' ? { from: customFrom.value, to: customTo.value } : {}),
      ...(period.value !== 'custom' && period.value !== 'all' && asOf.value !== todayLocal()
        ? { asOf: asOf.value }
        : {}),
    },
  })
}

const showSummary = computed(
  () => filtered.value.length > 0 || insightSummary.value.levers.length > 0,
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
    return ''
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

function onInsightChart(id: InsightChartId) {
  insightOpen.value = false
  chart.value = id
  if (id === 'category' || id === 'top') {
    kind.value = 'expense'
  }
}
</script>

<template>
  <div class="stats">
    <div class="stats__intro" data-tour="stats-chart">
      <div class="stats__toolbar">
        <AppSelect id="stats-chart" v-model="chart" size="medium" aria-label="Вид статистики">
          <option value="category">По категориям</option>
          <option value="weekday">По дням недели</option>
          <option value="heatmap">Календарь расходов</option>
          <option value="trend">Динамика</option>
          <option value="top">Топ операций</option>
          <option v-if="selectedAccountId === ALL_ACCOUNTS_ID" value="accounts">По счетам</option>
          <option v-if="showMembers" value="members">По участникам</option>
          <option value="forecast">Прогноз баланса</option>
        </AppSelect>
        <AppPeriodSelect
          v-model="period"
          v-model:from="customFrom"
          v-model:to="customTo"
          v-model:as-of="asOf"
          :label="periodLabel"
          :can-next="canShiftNext"
          @shift="onPeriodShift"
        />
      </div>

      <AppButton v-if="showSummary" variant="secondary" block @click="insightOpen = true">
        Сводка и советы
      </AppButton>
    </div>

    <AppEmpty v-if="!filtered.length && chart !== 'forecast'" description="Нет операций за период" />

    <template v-if="filtered.length || chart === 'forecast'">
      <section class="stats__chart">
        <AppSegmented
          v-if="showKind"
          v-model="kind"
          compact
          :options="kindOptions"
          aria-label="Тип операций"
        />

        <button
          v-if="chart === 'category' && drillGroup"
          type="button"
          class="stats__back"
          @click="drillGroupId = null"
        >
          Назад · {{ drillGroup.name }}
        </button>

        <CategorySpendChart
          v-if="chart === 'category' && categorySlices.length"
          embedded
          :slices="categorySlices"
          :title="chartTitle"
          :center-label="centerLabel"
          @legend-click="openCategorySlice"
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

        <AccountSpendChart
          v-else-if="chart === 'members' && memberSlices.length"
          embedded
          title="По участникам"
          :slices="memberSlices"
        />
        <AppEmpty v-else-if="chart === 'members'" description="Нет операций участников за период" />

        <template v-else-if="chart === 'forecast'">
          <AppSegmented
            v-model="forecastHorizon"
            compact
            :options="forecastHorizonOptions"
            aria-label="Горизонт прогноза"
          />
          <ForecastChart v-if="forecastSlices.length" embedded :slices="forecastSlices" />
          <AppEmpty v-else description="Создайте счёт, чтобы увидеть прогноз баланса" />
        </template>
      </section>
    </template>

    <AppDrawer v-model:open="insightOpen" title="Сводка и советы" height="90%">
      <div class="insight-drawer">
        <p class="insight-drawer__lead">Сравнение выбранного периода с таким же прошлым</p>
        <section v-if="filtered.length" class="summary" aria-label="Сводка">
          <div class="summary__row">
            <div class="summary__item">
              <p class="summary__label">Расходы</p>
              <p class="summary__value is-out">{{ formatMoney(summary.expenseTotal) }}</p>
              <p
                v-if="previousSummary && formatDelta(summary.expenseTotal, previousSummary.expenseTotal)"
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
                v-if="previousSummary && formatDelta(summary.incomeTotal, previousSummary.incomeTotal)"
                class="summary__delta"
                :class="deltaClass(summary.incomeTotal, previousSummary.incomeTotal)"
              >
                {{ formatDelta(summary.incomeTotal, previousSummary.incomeTotal) }}
              </p>
            </div>
            <div class="summary__item">
              <p class="summary__label">Итого</p>
              <p class="summary__value" :class="summary.net >= 0 ? 'is-in' : 'is-out'">
                {{ formatMoney(summary.net) }}
              </p>
              <p
                v-if="previousSummary && formatDelta(summary.net, previousSummary.net)"
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
              <p class="summary__label">Расходы от доходов</p>
              <p class="summary__value">{{ formatShare(share) }}</p>
            </div>
          </div>
        </section>

        <StatsInsightPanel
          v-if="insightOpen && insightSummary.levers.length"
          plain
          :summary="insightSummary"
          @select-chart="onInsightChart"
        />
      </div>
    </AppDrawer>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.stats__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.stats__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
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

.stats__back {
  align-self: start;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.insight-drawer {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.insight-drawer__lead {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
