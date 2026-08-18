<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDisplayDate, formatMoney, todayLocal } from '@/shared'
import type { HeatmapDay, HeatmapWeek } from '@/entities/transaction'

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const props = withDefaults(
  defineProps<{
    weeks: HeatmapWeek[]
    capped?: boolean
    embedded?: boolean
  }>(),
  {
    capped: false,
    embedded: false,
  },
)

const selectedDate = ref('')

const days = computed(() => props.weeks.flatMap((week) => week.days))
const maxAmount = computed(() => days.value.reduce((max, day) => Math.max(max, day.amount), 0))
const selected = computed(() => days.value.find((day) => day.date === selectedDate.value))

watch(
  () => props.weeks,
  () => {
    const today = days.value.find((day) => day.date === todayLocal() && day.inPeriod && !day.isFuture)
    if (today) {
      selectedDate.value = today.date
      return
    }
    const peak = days.value.reduce<HeatmapDay | undefined>((best, day) => {
      if (!day.inPeriod || day.isFuture) {
        return best
      }
      if (!best || day.amount > best.amount) {
        return day
      }
      return best
    }, undefined)
    selectedDate.value = peak?.date ?? ''
  },
  { immediate: true },
)

function level(amount: number) {
  if (amount <= 0 || maxAmount.value <= 0) {
    return 0
  }
  return Math.max(1, Math.min(4, Math.ceil((amount / maxAmount.value) * 4)))
}

function canSelect(day: HeatmapDay) {
  return day.inPeriod && !day.isFuture
}

function pick(day: HeatmapDay) {
  if (!canSelect(day)) {
    return
  }
  selectedDate.value = day.date
}

function label(day: HeatmapDay) {
  const date = formatDisplayDate(day.date)
  if (!canSelect(day)) {
    return date
  }
  return `${date}, ${formatMoney(day.amount)}`
}
</script>

<template>
  <section class="card" :class="{ 'is-embedded': embedded }">
    <h2 class="card__title">Расходы по дням</h2>
    <p v-if="capped" class="card__hint">Показан последний год</p>

    <div class="week week--head" aria-hidden="true">
      <span v-for="item in WEEKDAY_LABELS" :key="item" class="head">{{ item }}</span>
    </div>

    <div class="months">
      <div v-for="(week, index) in weeks" :key="week.days[0]?.date ?? index" class="month">
        <p v-if="week.monthLabel" class="month__label">{{ week.monthLabel }}</p>
        <div class="week">
          <template v-for="day in week.days" :key="day.date">
            <span v-if="!day.inPeriod" class="cell cell--empty" aria-hidden="true" />
            <button
              v-else
              class="cell"
              :class="[
                `level-${level(day.amount)}`,
                {
                  'is-future': day.isFuture,
                  'is-selected': selectedDate === day.date,
                },
              ]"
              type="button"
              :disabled="!canSelect(day)"
              :aria-pressed="selectedDate === day.date"
              :aria-label="label(day)"
              @click="pick(day)"
            >
              {{ day.day }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <p v-if="selected" class="card__picked">
      {{ formatDisplayDate(selected.date) }} · {{ formatMoney(selected.amount) }}
    </p>

    <div class="legend" aria-hidden="true">
      <span>Меньше расходов</span>
      <span class="legend__swatch level-0" />
      <span class="legend__swatch level-1" />
      <span class="legend__swatch level-2" />
      <span class="legend__swatch level-3" />
      <span class="legend__swatch level-4" />
      <span>Больше расходов</span>
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

.card__hint,
.card__picked,
.month__label,
.head,
.legend {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.card__hint {
  margin: calc(var(--space-3) * -1) 0 var(--space-3);
}

.card__picked {
  margin-top: var(--space-3);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.months {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.month__label {
  margin: var(--space-2) 0 var(--space-1);
  font-weight: 700;
  text-transform: capitalize;
}

.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.week--head {
  margin-bottom: var(--space-2);
}

.head {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  font-weight: 700;
}

.cell,
.legend__swatch {
  background: var(--color-bg);
}

.cell {
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.cell:disabled {
  cursor: default;
}

.cell.is-future {
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-bg) 70%, transparent);
}

.cell--empty {
  min-height: 44px;
  background: transparent;
  pointer-events: none;
}

.cell.is-selected {
  box-shadow: inset 0 0 0 2px var(--color-text);
}

.level-1 {
  background: color-mix(in srgb, var(--color-warning) 22%, var(--color-surface));
}

.level-2 {
  background: color-mix(in srgb, var(--color-warning) 42%, var(--color-surface));
}

.level-3 {
  background: color-mix(in srgb, var(--color-warning) 68%, var(--color-surface));
  color: var(--color-on-accent);
}

.level-4 {
  background: var(--color-warning);
  color: var(--color-on-accent);
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: var(--space-3);
}

.legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
</style>
