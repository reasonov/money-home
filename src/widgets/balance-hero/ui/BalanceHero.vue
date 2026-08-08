<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AppDrawer,
  availableUntilNextIncome,
  formatMoney,
  formatProjectionDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { useBalanceStore } from '@/entities/balance'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { EditBalanceForm } from '@/features/edit-balance'

const balance = useBalanceStore()
const incomeRules = useIncomeRuleStore()
const purchases = usePurchaseStore()
const editOpen = ref(false)

const freeUntilIncome = computed(() =>
  availableUntilNextIncome({
    currentBalance: balance.amount,
    asOfDate: parseLocalDate(todayLocal()),
    incomeRules: incomeRules.active.map((rule) => ({
      amount: rule.amount,
      frequency: rule.frequency,
      weekday: rule.weekday,
      monthDay: rule.monthDay,
      anchorDate: rule.anchorDate,
      active: rule.active,
    })),
    plannedPurchases: purchases.planned.map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount,
      plannedDate: item.plannedDate,
      status: item.status,
    })),
  }),
)

function daysUntil(date: Date): number {
  const asOf = parseLocalDate(todayLocal())
  const msPerDay = 24 * 60 * 60 * 1000
  const start = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((end.getTime() - start.getTime()) / msPerDay)
}

function formatDaysLabel(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100
  if (mod10 === 1 && mod100 !== 11) return `${days} день`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${days} дня`
  return `${days} дней`
}

const freeHint = computed(() => {
  const { nextIncomeDate, available } = freeUntilIncome.value
  if (available < 0) {
    return nextIncomeDate
      ? `План превышает баланс до пополнения ${formatProjectionDate(nextIncomeDate)}. Перенесите покупки или измените суммы.`
      : 'План превышает баланс. Перенесите покупки на более поздние даты или уменьшите суммы.'
  }
  if (nextIncomeDate) {
    return `До ближайшего пополнения ${formatDaysLabel(daysUntil(nextIncomeDate))}`
  }
  return 'Правила пополнения не заданы'
})

function openEdit() {
  editOpen.value = true
}

function onBalanceSaved() {
  editOpen.value = false
}
</script>

<template>
  <section class="hero">
    <p class="hero__label">Общий баланс</p>
    <button type="button" class="hero__amount-btn" @click="openEdit">
      <span class="hero__amount money money-soft">{{ formatMoney(balance.amount) }}</span>
      <span class="hero__edit-hint">Изменить</span>
    </button>

    <div class="hero__free">
      <div class="hero__free-row">
        <p class="hero__free-label">Свободно до пополнения</p>
        <p
          class="hero__free-amount money money-soft"
          :class="{ 'is-negative': freeUntilIncome.available < 0 }"
        >
          {{ formatMoney(freeUntilIncome.available) }}
        </p>
      </div>
      <p class="hero__free-hint" :class="{ 'is-warning': freeUntilIncome.available < 0 }">
        {{ freeHint }}
      </p>
    </div>

    <AppDrawer v-model:open="editOpen" title="Изменить баланс">
      <EditBalanceForm @saved="onBalanceSaved" />
    </AppDrawer>
  </section>
</template>

<style scoped>
.hero {
  padding: var(--space-5) var(--space-4);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 45%),
    var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.hero__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.hero__amount-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.hero__amount {
  font-size: clamp(2rem, 8vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-text);
}

.hero__edit-hint {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-accent);
}

.hero__free {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.hero__free-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.hero__free-label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.hero__free-amount {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-accent);
}

.hero__free-amount.is-negative {
  color: var(--color-warning);
}

.hero__free-hint {
  margin: var(--space-1) 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.hero__free-hint.is-warning {
  color: var(--color-warning);
  font-weight: 600;
}

.money {
  font-variant-numeric: tabular-nums;
}
</style>
