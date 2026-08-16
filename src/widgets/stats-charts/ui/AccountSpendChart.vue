<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatMoney, formatMoneyPlain } from '@/shared'
import { registerStatsCharts } from '../lib/registerCharts'
import { useChartTheme } from '../lib/useChartTheme'

registerStatsCharts()

export interface AccountChartSlice {
  accountId: string
  name: string
  expenseTotal: number
  incomeTotal: number
}

const props = withDefaults(
  defineProps<{
    slices: AccountChartSlice[]
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const theme = useChartTheme()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.slices.map((slice) => slice.name),
  datasets: [
    {
      label: 'Расходы',
      data: props.slices.map((slice) => slice.expenseTotal),
      backgroundColor: theme.value.warning,
      borderRadius: 8,
      maxBarThickness: 22,
    },
    {
      label: 'Доходы',
      data: props.slices.map((slice) => slice.incomeTotal),
      backgroundColor: theme.value.success,
      borderRadius: 8,
      maxBarThickness: 22,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.value.surface,
      titleColor: theme.value.text,
      bodyColor: theme.value.text,
      borderColor: theme.value.border,
      borderWidth: 1,
      callbacks: {
        label: (item: TooltipItem<'bar'>) =>
          `${item.dataset.label} — ${formatMoney(Number(item.raw ?? 0))}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: theme.value.muted,
        font: { family: theme.value.font, size: 12, weight: 700 },
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: theme.value.border },
      ticks: {
        color: theme.value.muted,
        font: { family: theme.value.font, size: 11 },
        callback: (value) => formatMoneyPlain(Number(value)),
      },
    },
  },
}))
</script>

<template>
  <section class="card" :class="{ 'is-embedded': embedded }">
    <h2 class="card__title">По счетам</h2>
    <div class="card__chart">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <ul class="legend">
      <li class="legend__item">
        <span class="legend__dot is-out" aria-hidden="true" />
        Расходы
      </li>
      <li class="legend__item">
        <span class="legend__dot is-in" aria-hidden="true" />
        Доходы
      </li>
    </ul>
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
  height: 220px;
}

.legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.legend__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.is-out {
  background: var(--color-warning);
}

.is-in {
  background: var(--color-success);
}

@media (orientation: landscape) and (max-height: 500px) {
  .card__chart {
    height: 180px;
  }
}
</style>
