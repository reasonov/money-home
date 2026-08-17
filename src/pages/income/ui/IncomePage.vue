<script setup lang="ts">
import { IncomeRulesPanel } from '@/features/manage-income'
import { ExpenseRulesPanel } from '@/features/manage-expense'
</script>

<template>
  <div class="page">
    <section class="section">
      <h2 class="section__title">Регулярные пополнения</h2>
      <IncomeRulesPanel />
    </section>
    <section class="section">
      <h2 class="section__title">Регулярные расходы</h2>
      <ExpenseRulesPanel />
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
</style>
