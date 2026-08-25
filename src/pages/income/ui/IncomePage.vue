<script setup lang="ts">
import { ref } from 'vue'
import { AppHelpTip, AppSegmented } from '@/shared'
import { IncomeRulesPanel } from '@/features/manage-income'
import { ExpenseRulesPanel } from '@/features/manage-expense'
import { TransferRulesPanel } from '@/features/manage-transfer'
import { RegularFeed } from '@/widgets/regular-feed'

type RuleTab = 'all' | 'income' | 'expense' | 'transfer'

const tab = ref<RuleTab>('all')

const tabOptions: { value: RuleTab; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'income', label: 'Доходы' },
  { value: 'expense', label: 'Расходы' },
  { value: 'transfer', label: 'Переводы' },
]
</script>

<template>
  <div class="page" data-tour="income-rules">
    <AppSegmented v-model="tab" compact :options="tabOptions" aria-label="Тип регулярных операций" />
    <RegularFeed v-if="tab === 'all'" />
    <section v-else-if="tab === 'income'" class="section">
      <h2 class="section__title">
        Регулярные пополнения
        <AppHelpTip
          text="В назначенный день сумма зачислится сама. Придёт уведомление — операцию можно отменить."
        />
      </h2>
      <IncomeRulesPanel />
    </section>
    <section v-else-if="tab === 'expense'" class="section">
      <h2 class="section__title">
        Регулярные расходы
        <AppHelpTip
          text="В назначенный день сумма спишется сама. Придёт уведомление — операцию можно отменить."
        />
      </h2>
      <ExpenseRulesPanel />
    </section>
    <section v-else class="section">
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
