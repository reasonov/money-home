<script setup lang="ts">
import { AppHelpTip } from '@/shared'
import { IncomeRulesPanel } from '@/features/manage-income'
import { ExpenseRulesPanel } from '@/features/manage-expense'
import { TransferRulesPanel } from '@/features/manage-transfer'
</script>

<template>
  <div class="page" data-tour="income-rules">
    <section class="section">
      <h2 class="section__title">
        Регулярные пополнения
        <AppHelpTip
          text="В назначенный день сумма зачислится сама. Придёт уведомление — операцию можно отменить."
        />
      </h2>
      <IncomeRulesPanel />
    </section>
    <section class="section">
      <h2 class="section__title">
        Регулярные расходы
        <AppHelpTip
          text="В назначенный день сумма спишется сама. Придёт уведомление — операцию можно отменить."
        />
      </h2>
      <ExpenseRulesPanel />
    </section>
    <section class="section">
      <h2 class="section__title">
        Регулярные переводы
        <AppHelpTip
          text="В назначенный день сумма перейдёт со счёта на счёт. Придёт уведомление — операцию можно отменить."
        />
      </h2>
      <TransferRulesPanel />
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
  display: inline-flex;
  align-items: center;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
</style>
