<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ActiveElement, ChartEvent, ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { formatMoney } from '@/shared'
import type { CategorySpendSlice } from '@/entities/transaction'
import { registerStatsCharts } from '../lib/registerCharts'
import { useChartTheme } from '../lib/useChartTheme'

registerStatsCharts()

const props = withDefaults(
  defineProps<{
    slices: CategorySpendSlice[]
    title?: string
    centerLabel?: string
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const theme = useChartTheme()
const selectedIndex = ref<number | null>(null)
const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.amount, 0))
const selected = computed(() =>
  selectedIndex.value == null ? null : (props.slices[selectedIndex.value] ?? null),
)

watch(
  () => props.slices,
  () => {
    selectedIndex.value = null
  },
)

function formatShare(amount: number, sum: number): string {
  if (sum <= 0) {
    return '0%'
  }
  const percent = (amount / sum) * 100
  if (percent < 0.5) {
    return '<1%'
  }
  return `${Math.round(percent)}%`
}

function selectIndex(index: number | null) {
  if (index == null || index === selectedIndex.value) {
    selectedIndex.value = null
    return
  }
  selectedIndex.value = index
}

function onChartClick(_event: ChartEvent, elements: ActiveElement[]) {
  if (!elements.length) {
    selectedIndex.value = null
    return
  }
  selectIndex(elements[0]?.index ?? null)
}

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.slices.map((slice) => slice.name),
  datasets: [
    {
      data: props.slices.map((slice) => slice.amount),
      backgroundColor: props.slices.map((slice) => slice.color || theme.value.muted),
      borderColor: theme.value.surface,
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  onClick: onChartClick,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.value.surface,
      titleColor: theme.value.text,
      bodyColor: theme.value.text,
      borderColor: theme.value.border,
      borderWidth: 1,
      displayColors: false,
      callbacks: {
        title: () => '',
        label: (item: TooltipItem<'doughnut'>) => {
          const amount = Number(item.raw ?? 0)
          return `${item.label} — ${formatMoney(amount)} · ${formatShare(amount, total.value)}`
        },
      },
    },
  },
}))
</script>

<template>
  <section class="card" :class="{ 'is-embedded': embedded }">
    <h2 v-if="title" class="card__title">{{ title }}</h2>
    <div class="card__body">
      <div class="card__chart">
        <Doughnut :data="chartData" :options="chartOptions" />
        <div v-if="centerLabel || total" class="card__center">
          <template v-if="selected">
            <p class="card__center-label">{{ selected.name }}</p>
            <p class="card__center-value">{{ formatShare(selected.amount, total) }}</p>
            <p class="card__center-amount">{{ formatMoney(selected.amount) }}</p>
          </template>
          <template v-else>
            <p v-if="centerLabel" class="card__center-label">{{ centerLabel }}</p>
            <p class="card__center-value">{{ formatMoney(total) }}</p>
          </template>
        </div>
      </div>
      <ul class="legend">
        <li v-for="(slice, index) in slices" :key="slice.categoryId ?? slice.name">
          <button
            type="button"
            class="legend__item"
            :class="{ 'is-active': selectedIndex === index }"
            @click="selectIndex(index)"
          >
            <span
              class="legend__dot"
              :style="{ background: slice.color || theme.muted }"
              aria-hidden="true"
            />
            <span class="legend__name">{{ slice.name }}</span>
            <span class="legend__amount">{{ formatMoney(slice.amount) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.card.is-embedded {
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.card__title {
  margin-bottom: var(--space-3);
  font-size: 1.125rem;
}

.card__chart {
  position: relative;
  height: 220px;
}

.card__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 28%;
  pointer-events: none;
}

.card__center-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__center-value {
  font-size: 1.125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.card__center-amount {
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: 0;
  list-style: none;
}

@media (orientation: landscape) and (max-height: 500px) {
  .card__body {
    display: grid;
    grid-template-columns: minmax(160px, 200px) 1fr;
    gap: var(--space-4);
    align-items: center;
  }

  .card__chart {
    height: 180px;
  }

  .legend {
    margin-top: 0;
  }
}

.legend__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 0 var(--space-1);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.legend__item.is-active {
  background: var(--color-bg);
}

.legend__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend__name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
}

.legend__amount {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
