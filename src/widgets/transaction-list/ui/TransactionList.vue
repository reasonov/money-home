<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppField, AppSelect, formatDisplayDate, formatMoney } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { CategoryIcon } from '@/entities/category'
import { type Transaction, type TransactionKind } from '@/entities/transaction'
import { AutoIncomeActions } from '@/features/review-auto-income'

const props = defineProps<{
  items: Transaction[]
}>()

const accounts = useAccountStore()
const kind = ref<'all' | TransactionKind | 'income_rule'>('all')

const filtered = computed(() =>
  props.items.filter((item) => {
    if (kind.value === 'income_rule') {
      return item.source === 'income_rule'
    }
    if (kind.value !== 'all' && item.kind !== kind.value) {
      return false
    }
    return true
  }),
)

const groups = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const item of filtered.value) {
    const list = map.get(item.occurredOn) ?? []
    list.push(item)
    map.set(item.occurredOn, list)
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }))
})

function sign(kindValue: TransactionKind) {
  return kindValue === 'income' ? '+' : '−'
}

function accountName(id: string) {
  return accounts.getById(id)?.name ?? 'Счёт'
}
</script>

<template>
  <div class="list">
    <div class="filters">
      <AppField label="Тип" for-id="tx-kind">
        <AppSelect id="tx-kind" v-model="kind">
          <option value="all">Все</option>
          <option value="expense">Расходы</option>
          <option value="income">Доходы</option>
          <option value="transfer">Переводы</option>
          <option value="income_rule">Пополнения</option>
        </AppSelect>
      </AppField>
    </div>

    <p v-if="!groups.length" class="empty">Операций пока нет</p>
    <section v-for="group in groups" :key="group.date" class="group">
      <h2>{{ formatDisplayDate(group.date) }}</h2>
      <div v-for="item in group.items" :key="item.id" class="row">
        <CategoryIcon
          v-if="item.categoryIcon && item.categoryColor"
          :icon="item.categoryIcon"
          :color="item.categoryColor"
          :size="32"
        />
        <div class="row__body">
          <p class="row__title">{{ item.title || item.categoryName || 'Операция' }}</p>
          <p class="row__meta">
            {{ accountName(item.accountId) }}
            <template v-if="item.kind === 'transfer' && item.counterpartyAccountId">
              → {{ accountName(item.counterpartyAccountId) }}
            </template>
          </p>
          <AutoIncomeActions v-if="item.source === 'income_rule'" :transaction-id="item.id" />
        </div>
        <p class="row__amount" :class="item.kind === 'income' ? 'is-in' : 'is-out'">
          {{ sign(item.kind) }}{{ formatMoney(item.amount) }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.list,
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.group h2 {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.row__body {
  flex: 1;
  min-width: 0;
}

.row__title {
  font-weight: 700;
}

.row__meta,
.empty {
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
