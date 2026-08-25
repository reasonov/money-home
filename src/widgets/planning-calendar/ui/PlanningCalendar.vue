<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import {
  addDays,
  AppButton,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  isPastDate,
  openFormDrawer,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { usePurchaseStore, type Purchase } from '@/entities/purchase'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const accounts = useAccountStore()
const purchases = usePurchaseStore()

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

const eventsByDate = computed(() => {
  const map = new Map<string, Purchase[]>()
  const startIso = cells.value[0]?.iso
  const endIso = cells.value[cells.value.length - 1]?.iso
  if (!startIso || !endIso) {
    return map
  }

  const source =
    accounts.selectedAccountId === ALL_ACCOUNTS_ID
      ? purchases.planned
      : purchases.planned.filter((item) => item.accountId === accounts.selectedAccountId)

  for (const item of source) {
    if (!item.plannedDate || item.plannedDate < startIso || item.plannedDate > endIso) {
      continue
    }
    const list = map.get(item.plannedDate) ?? []
    list.push(item)
    map.set(item.plannedDate, list)
  }
  return map
})

const selectedEvents = computed(() => eventsByDate.value.get(selected.value) ?? [])

function addPurchase() {
  openFormDrawer({ name: 'purchase-new', plannedDate: selected.value })
}

function edit(id: string) {
  openFormDrawer({ name: 'purchase-edit', purchaseId: id })
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
          'is-overdue':
            Boolean((eventsByDate.get(cell.iso) ?? []).length) && isPastDate(cell.iso, today),
        }"
        :aria-label="cell.iso"
        @click="selected = cell.iso"
      >
        <span class="cell__day">{{ cell.day }}</span>
        <span class="cell__dots">
          <span v-if="(eventsByDate.get(cell.iso) ?? []).length" class="dot" />
        </span>
      </button>
    </div>

    <section class="day">
      <h3 class="day__title">{{ formatShortDate(selected) }}</h3>
      <ul v-if="selectedEvents.length" class="day__list">
        <li v-for="item in selectedEvents" :key="item.id">
          <button class="day__row" type="button" @click="edit(item.id)">
            <span>{{ item.title }}</span>
            <span>{{ formatMoney(item.amount) }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="day__empty">В этот день нет покупок</p>
      <AppButton variant="secondary" block @click="addPurchase">Новая покупка</AppButton>
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
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.day__empty {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
