<script setup lang="ts">
import { AppSwitch } from '@/shared'
import { usePreferencesStore } from '@/entities/preferences'

const prefs = usePreferencesStore()
</script>

<template>
  <div class="page">
    <section class="card">
      <div class="row">
        <span class="row__text">
          <span class="row__label">Предложения при вводе суммы</span>
          <span class="row__hint">Показывать прошлые расходы и доходы с той же суммой</span>
        </span>
        <AppSwitch
          :checked="prefs.amountSuggestions"
          aria-label="Предложения при вводе суммы"
          @update:checked="prefs.setAmountSuggestions"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
}

.row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__label {
  font-weight: 700;
}

.row__hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}
</style>
