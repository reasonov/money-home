<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { NDropdown } from 'naive-ui'
import {
  addDays,
  AppButton,
  AppTag,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { isPlanAddKind, openPlanCreate, openPlanEvent, PLAN_ADD_OPTIONS } from '../lib/openPlanCreate'
import {
  PLAN_KIND_LABEL,
  PLAN_KIND_TAG,
  usePlanEvents,
  type PlanEvent,
  type PlanEventKind,
  type PlanScope,
} from '../lib/usePlanEvents'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const props = withDefaults(
  defineProps<{
    scope?: PlanScope
  }>(),
  { scope: 'all' },
)

const today = todayLocal()
const cursor = ref(new Date(parseLocalDate(today).getFullYear(), parseLocalDate(today).getMonth(), 1))
const selected = ref(today)

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(cursor.value),
)

function shiftMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

const cells = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const weekday = first.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  const start = new Date(year, month, 1 + offset)
  const days = []
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i)
    days.push({
      iso: formatLocalDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    })
  }
  return days
})

const range = computed(() => {
  const startIso = cells.value[0]?.iso
  const endIso = cells.value[cells.value.length - 1]?.iso
  if (!startIso || !endIso) {
    return null
  }
  return { start: startIso, end: endIso }
})

const { eventsByDate } = usePlanEvents(
  () => props.scope,
  range,
)

const selectedEvents = computed(() => eventsByDate.value.get(selected.value) ?? [])

const emptyText = computed(() => {
  if (props.scope === 'regular') {
    return 'В этот день нет регулярных операций'
  }
  if (props.scope === 'purchases') {
    return 'В этот день нет покупок'
  }
  return 'В этот день нет планов'
})

function dotsFor(iso: string): PlanEventKind[] {
  const items = eventsByDate.value.get(iso) ?? []
  const seen = new Set<PlanEventKind>()
  const dots: PlanEventKind[] = []
  for (const item of items) {
    if (seen.has(item.kind)) {
      continue
    }
    seen.add(item.kind)
    dots.push(item.kind)
    if (dots.length === 3) {
      break
    }
  }
  return dots
}

function isOverdueCell(iso: string) {
  const items = eventsByDate.value.get(iso) ?? []
  return items.some((item) => item.overdue)
}

function amountTone(item: PlanEvent) {
  if (item.kind === 'income' || item.inflow) {
    return 'in'
  }
  if (item.kind === 'transfer' && item.inflow == null) {
    return 'xfer'
  }
  return 'out'
}

function amountPrefix(item: PlanEvent) {
  const tone = amountTone(item)
  if (tone === 'in') {
    return '+'
  }
  if (tone === 'out') {
    return '−'
  }
  return ''
}

function addOnDay(key: string | number) {
  if (isPlanAddKind(key)) {
    openPlanCreate(key, selected.value)
  }
}

function openItem(item: PlanEvent) {
  openPlanEvent(item)
}
</script>

<template>
  <div class="cal">
    <div class="cal__nav">
      <button type="button" class="cal__shift" aria-label="Предыдущий месяц" @click="shiftMonth(-1)">
        <ChevronLeft :size="20" :stroke-width="2" />
      </button>
      <p class="cal__month">{{ monthLabel }}</p>
      <button type="button" class="cal__shift" aria-label="Следующий месяц" @click="shiftMonth(1)">
        <ChevronRight :size="20" :stroke-width="2" />
      </button>
    </div>
    <div class="cal__weekdays">
      <span v-for="label in WEEKDAYS" :key="label">{{ label }}</span>
    </div>
    <div class="cal__grid">
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        class="cell"
        :class="{
          'is-muted': !cell.inMonth,
          'is-today': cell.iso === today,
          'is-selected': cell.iso === selected,
          'is-overdue': isOverdueCell(cell.iso),
        }"
        :aria-label="cell.iso"
        @click="selected = cell.iso"
      >
        <span class="cell__day">{{ cell.day }}</span>
        <span class="cell__dots">
          <span
            v-for="kind in dotsFor(cell.iso)"
            :key="kind"
            class="dot"
            :class="`is-${kind}`"
          />
        </span>
      </button>
    </div>

    <section class="day">
      <h3 class="day__title">{{ formatShortDate(selected) }}</h3>
      <ul v-if="selectedEvents.length" class="day__list">
        <li v-for="item in selectedEvents" :key="item.key">
          <button class="day__row" type="button" @click="openItem(item)">
            <span class="day__body">
              <span class="day__name">{{ item.title }}</span>
              <AppTag :type="PLAN_KIND_TAG[item.kind]">{{ PLAN_KIND_LABEL[item.kind] }}</AppTag>
            </span>
            <span class="day__amount" :class="`is-${amountTone(item)}`">
              {{ amountPrefix(item) }}{{ formatMoney(item.amount) }}
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="day__empty">{{ emptyText }}</p>
      <NDropdown
        trigger="click"
        placement="bottom-end"
        :options="PLAN_ADD_OPTIONS"
        @select="addOnDay"
      >
        <AppButton variant="secondary" block>Добавить</AppButton>
      </NDropdown>
    </section>
  </div>
</template>

<style scoped>
.cal {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cal__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cal__month {
  margin: 0;
  font-weight: 800;
  text-transform: capitalize;
}

.cal__shift {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: inherit;
  cursor: pointer;
}

.cal__weekdays,
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.cal__weekdays {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-align: center;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 48px;
  padding: 6px 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.cell.is-muted {
  opacity: 0.4;
}

.cell.is-today .cell__day {
  font-weight: 800;
  color: var(--color-accent);
}

.cell.is-selected {
  background: var(--color-accent-soft);
}

.cell.is-overdue .cell__day {
  color: var(--color-warning);
}

.cell__day {
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.cell__dots {
  display: flex;
  gap: 3px;
  min-height: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}

.dot.is-income {
  background: var(--color-success);
}

.dot.is-expense {
  background: var(--color-warning);
}

.dot.is-transfer {
  background: var(--color-accent);
}

.dot.is-purchase {
  background: var(--color-text);
}

.day {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.day__title {
  margin: 0;
  font-size: 1rem;
}

.day__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.day__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.day__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.day__name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day__amount {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.day__empty {
  margin: 0;
  color: var(--color-text-muted);
}

.day :deep(.n-dropdown-trigger) {
  display: block;
  width: 100%;
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}

.is-xfer {
  color: var(--color-accent);
}
</style>
