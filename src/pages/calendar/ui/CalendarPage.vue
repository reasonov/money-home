<script setup lang="ts">
import { ref } from 'vue'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { AppButton, AppSegmented, openFormDrawer } from '@/shared'
import { PurchaseList } from '@/widgets/purchase-list'
import { PlanningCalendar } from '@/widgets/planning-calendar'

const accounts = useAccountStore()
const view = ref<'list' | 'month'>('list')

const viewOptions: { value: 'list' | 'month'; label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'month', label: 'Месяц' },
]

function ruleAccountId() {
  return accounts.selectedAccountId !== ALL_ACCOUNTS_ID ? accounts.selectedAccountId : undefined
}

function openIncomeRule() {
  openFormDrawer({
    name: 'income-rule',
    accountId: ruleAccountId(),
  })
}

function openExpenseRule() {
  openFormDrawer({
    name: 'expense-rule',
    accountId: ruleAccountId(),
  })
}

</script>

<template>
  <div class="calendar">
    <div class="calendar__toolbar">
      <AppSegmented v-model="view" compact :options="viewOptions" aria-label="Вид планирования" />
    </div>
    <div class="calendar__cta" data-tour="calendar-cta">
      <AppButton block @click="openFormDrawer({ name: 'purchase-new' })">Новая покупка</AppButton>
      <div class="calendar__cta-row">
        <AppButton variant="secondary" block @click="openIncomeRule">Пополнение</AppButton>
        <AppButton variant="secondary" block @click="openExpenseRule">Регулярный расход</AppButton>
      </div>
    </div>
    <PlanningCalendar v-if="view === 'month'" />
    <PurchaseList v-else />
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.calendar__toolbar {
  display: flex;
}

.calendar__cta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.calendar__cta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
</style>
