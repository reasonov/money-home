<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatMoney } from '@/shared'
import { usePurchaseStore } from '@/entities/purchase'

const store = usePurchaseStore()
</script>

<template>
  <RouterLink class="teaser" to="/history" aria-label="Открыть историю покупок">
    <div class="teaser__text">
      <p class="teaser__title">История покупок</p>
      <p class="teaser__total">
        Всего потрачено на покупки
        <span class="money money-soft">{{ formatMoney(store.totalSpent) }}</span>
      </p>
    </div>
    <span class="teaser__action">Открыть</span>
  </RouterLink>
</template>

<style scoped>
.teaser {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  text-decoration: none;
  color: inherit;
}

.teaser:hover {
  text-decoration: none;
}

.teaser__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.teaser__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.teaser__total {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
}

.teaser__total .money {
  margin-left: var(--space-1);
  color: var(--color-text);
  font-weight: 800;
}

.teaser__action {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-accent);
}

.money {
  font-variant-numeric: tabular-nums;
}
</style>
