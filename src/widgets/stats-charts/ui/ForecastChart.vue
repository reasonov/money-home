<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { Line } from 'vue-chartjs'
import { formatMoney, formatMoneyPlain, type ForecastSlice } from '@/shared'
import { registerStatsCharts } from '../lib/registerCharts'
import { useChartTheme } from '../lib/useChartTheme'

registerStatsCharts()

const props = withDefaults(
  defineProps<{
    slices: ForecastSlice[]
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const theme = useChartTheme()
const last = computed(() => props.slices[props.slices.length - 1]?.balance ?? 0)

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.slices.map((slice) => slice.label),
  datasets: [
    {
      label: 'Баланс',
      data: props.slices.map((slice) => slice.balance),
      borderColor: last.value >= 0 ? theme.value.success : theme.value.warning,
      backgroundColor: last.value >= 0 ? theme.value.success : theme.value.warning,
      pointBackgroundColor: last.value >= 0 ? theme.value.success : theme.value.warning,
      pointRadius: props.slices.length > 20 ? 0 : 3,
      tension: 0.25,
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.value.surface,
      titleColor: theme.value.text,
      bodyColor: theme.value.text,
      borderColor: theme.value.border,
      borderWidth: 1,
      callbacks: {
        label: (item: TooltipItem<'line'>) => formatMoney(Number(item.raw ?? 0)),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: theme.value.muted,
        font: { family: theme.value.font, size: 11, weight: 700 },
        maxRotation: 0,
        maxTicksLimit: 7,
      },
    },
    y: {
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
    <h2 class="card__title">Прогноз баланса</h2>
    <p class="card__hint">Учитывает текущий баланс, плановые покупки и регулярные операции</p>
    <div class="card__chart">
      <Line :data="chartData" :options="chartOptions" />
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
  margin-bottom: var(--space-1);
  font-size: 1.125rem;
}

.card__hint {
  margin: 0 0 var(--space-3);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.card__chart {
  height: 220px;
}

@media (orientation: landscape) and (max-height: 500px) {
  .card__chart {
    height: 180px;
  }
}
</style>
