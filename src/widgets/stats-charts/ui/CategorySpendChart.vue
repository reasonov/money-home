<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
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
const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.amount, 0))

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
        label: (item: TooltipItem<'doughnut'>) =>
          `${item.label} — ${formatMoney(Number(item.raw ?? 0))}`,
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
          <p v-if="centerLabel" class="card__center-label">{{ centerLabel }}</p>
          <p class="card__center-value">{{ formatMoney(total) }}</p>
        </div>
      </div>
      <ul class="legend">
        <li v-for="slice in slices" :key="slice.categoryId ?? slice.name" class="legend__item">
          <span
            class="legend__dot"
            :style="{ background: slice.color || theme.muted }"
            aria-hidden="true"
          />
          <span class="legend__name">{{ slice.name }}</span>
          <span class="legend__amount">{{ formatMoney(slice.amount) }}</span>
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
  pointer-events: none;
}

.card__center-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card__center-value {
  font-size: 1.125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
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
  min-height: 32px;
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
