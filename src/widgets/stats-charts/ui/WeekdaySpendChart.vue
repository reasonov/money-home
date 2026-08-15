<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatMoney, formatMoneyPlain } from '@/shared'
import type { WeekdaySpendSlice } from '@/entities/transaction'
import { registerStatsCharts } from '../lib/registerCharts'
import { useChartTheme } from '../lib/useChartTheme'

registerStatsCharts()

const props = defineProps<{
  slices: WeekdaySpendSlice[]
}>()

const theme = useChartTheme()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.slices.map((slice) => slice.label),
  datasets: [
    {
      data: props.slices.map((slice) => slice.amount),
      backgroundColor: theme.value.accent,
      borderRadius: 8,
      maxBarThickness: 28,
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
      displayColors: false,
      callbacks: {
        title: () => '',
        label: (item: TooltipItem<'bar'>) =>
          `${item.label} — ${formatMoney(Number(item.raw ?? 0))}`,
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
  <section class="card">
    <h2 class="card__title">Расходы по дням недели</h2>
    <div class="card__chart">
      <Bar :data="chartData" :options="chartOptions" />
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

.card__title {
  margin-bottom: var(--space-3);
  font-size: 1.125rem;
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
