<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { AppButton, formatDisplayDate, formatMoney } from '@/shared'
import { usePurchaseStore, PurchaseNotes, type Purchase } from '@/entities/purchase'

const store = usePurchaseStore()

const groups = computed(() => {
  const map = new Map<string, Purchase[]>()

  for (const item of store.done) {
    const list = map.get(item.plannedDate) ?? []
    list.push(item)
    map.set(item.plannedDate, list)
  }

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }))
})
</script>

<template>
  <section class="history">
    <div class="history__head">
      <h2 class="history__title">История покупок</h2>
      <p class="history__total">
        Всего потрачено
        <span class="money money-soft">{{ formatMoney(store.totalSpent) }}</span>
      </p>
    </div>

    <div v-if="groups.length" class="history__groups">
      <section v-for="group in groups" :key="group.date" class="group">
        <h3 class="group__date">{{ formatDisplayDate(group.date) }}</h3>
        <ul class="group__items">
          <li v-for="item in group.items" :key="item.id" class="item">
            <div class="item__main">
              <p class="item__title">{{ item.title }}</p>
              <PurchaseNotes v-if="item.notes" :notes="item.notes" />
            </div>
            <p class="item__amount money">{{ formatMoney(item.amount) }}</p>
          </li>
        </ul>
      </section>
    </div>

    <div v-else class="history__empty">
      <p class="history__empty-text">Пока нет завершённых покупок</p>
      <div class="history__empty-actions">
        <RouterLink to="/" custom v-slot="{ navigate }">
          <AppButton variant="secondary" block @click="navigate">К плану покупок</AppButton>
        </RouterLink>
        <RouterLink to="/purchases/new" custom v-slot="{ navigate }">
          <AppButton block @click="navigate">Новая покупка</AppButton>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history__title {
  margin: 0;
  font-size: 1.125rem;
}

.history__total {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}

.history__total .money {
  margin-left: var(--space-1);
  color: var(--color-text);
  font-weight: 800;
}

.history__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.group__date {
  margin-bottom: var(--space-3);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.group__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.item__title {
  margin: 0;
  font-weight: 700;
}

.item__meta {
  margin: var(--space-2) 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.item__amount {
  margin: 0;
  flex-shrink: 0;
  font-weight: 800;
}

.history__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.history__empty-text {
  margin: 0;
  color: var(--color-text-muted);
}

.history__empty-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.money {
  font-variant-numeric: tabular-nums;
}
</style>
