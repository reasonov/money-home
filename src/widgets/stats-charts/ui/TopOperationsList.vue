<script setup lang="ts">
import { formatDisplayDate, formatMoney } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { CategoryIcon } from '@/entities/category'
import type { Transaction } from '@/entities/transaction'

defineProps<{
  items: Transaction[]
}>()

const accounts = useAccountStore()

function accountName(id: string) {
  return accounts.getById(id)?.name ?? 'Счёт'
}

function sign(kind: Transaction['kind']) {
  return kind === 'income' ? '+' : '−'
}
</script>

<template>
  <section class="card">
    <h2 class="card__title">Топ операций</h2>
    <ol class="list">
      <li v-for="item in items" :key="item.id" class="row">
        <CategoryIcon
          v-if="item.categoryIcon && item.categoryColor"
          :icon="item.categoryIcon"
          :color="item.categoryColor"
          :size="32"
        />
        <div class="row__body">
          <p class="row__title">{{ item.title || item.categoryName || 'Операция' }}</p>
          <p class="row__meta">
            {{ accountName(item.accountId) }} · {{ formatDisplayDate(item.occurredOn) }}
          </p>
        </div>
        <p class="row__amount" :class="item.kind === 'income' ? 'is-in' : 'is-out'">
          {{ sign(item.kind) }}{{ formatMoney(item.amount) }}
        </p>
      </li>
    </ol>
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

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-height: 44px;
}

.row__body {
  flex: 1;
  min-width: 0;
}

.row__title {
  font-weight: 700;
}

.row__meta {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.row__amount {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}
</style>
