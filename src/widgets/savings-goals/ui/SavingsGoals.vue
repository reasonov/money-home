<script setup lang="ts">
import { computed } from 'vue'
import { AppButton, formatMoney, formatShortDate, openFormDrawer } from '@/shared'
import { useSavingsGoalStore } from '@/entities/savings-goal'
import { savingsPlanForAccount } from '@/features/edit-savings-goal'
import { openSavingsAdvice } from '@/features/savings-advice'

const props = withDefaults(
  defineProps<{
    accountId: string
    heading?: string
  }>(),
  {
    heading: 'Копилки',
  },
)

const goals = useSavingsGoalStore()

const items = computed(() => goals.activeFor(props.accountId))

const plan = computed(() =>
  savingsPlanForAccount(
    props.accountId,
    items.value.map((item) => ({
      id: item.id,
      title: item.title,
      targetAmount: item.targetAmount,
      targetDate: item.targetDate,
      savedAmount: item.savedAmount,
      startedOn: item.startedOn,
      status: item.status,
    })),
  ),
)

function percent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value * 100)))
}

function openGoal(id: string) {
  openFormDrawer({ name: 'savings-goal', accountId: props.accountId, goalId: id })
}

function openAdvice(id: string) {
  openSavingsAdvice(props.accountId, id)
}
</script>

<template>
  <section v-if="items.length" class="block">
    <h2 v-if="heading">{{ heading }}</h2>
    <p v-if="plan.overAllocated" class="warn">На копилках отмечено больше, чем есть на счёте</p>
    <ul class="list">
      <li v-for="goal in plan.goals" :key="goal.id ?? goal.title" class="card">
        <button type="button" class="card__main" @click="goal.id && openGoal(goal.id)">
          <span class="card__head">
            <span class="card__title">{{ goal.title || 'Копилка' }}</span>
            <span class="card__amount">
              {{ formatMoney(goal.savedAmount) }} из {{ formatMoney(goal.targetAmount) }}
            </span>
          </span>
          <span
            class="bar"
            role="progressbar"
            :aria-valuenow="percent(goal.moneyProgress)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="goal.title || 'Копилка'"
          >
            <span
              class="bar__fill"
              :class="goal.onTrack ? 'is-ok' : 'is-late'"
              :style="{ width: `${percent(goal.moneyProgress)}%` }"
            />
          </span>
          <span class="card__meta">
            <span :class="goal.onTrack ? 'is-ok' : 'is-late'">{{ goal.message }}</span>
            <span>до {{ formatShortDate(goal.targetDate) }}</span>
          </span>
        </button>
        <AppButton
          v-if="goal.id && !goal.onTrack"
          variant="secondary"
          block
          @click="openAdvice(goal.id)"
        >
          Как накопить
        </AppButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.block h2 {
  margin: 0;
  font-size: 1rem;
}

.warn {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-warning);
}

.list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  gap: var(--space-2);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.card__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.card__head,
.card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.card__title {
  font-weight: 700;
}

.card__amount,
.card__meta {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.bar {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--color-accent-soft);
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: 4px;
}

.bar__fill.is-ok,
.is-ok {
  color: var(--color-success);
}

.bar__fill.is-ok {
  background: var(--color-success);
}

.bar__fill.is-late,
.is-late {
  color: var(--color-warning);
}

.bar__fill.is-late {
  background: var(--color-warning);
}
</style>
