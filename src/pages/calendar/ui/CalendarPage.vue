<script setup lang="ts">
import { computed, ref } from 'vue'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { usePurchaseStore } from '@/entities/purchase'
import { AppButton, AppSegmented, openFormDrawer } from '@/shared'
import { PurchaseList } from '@/widgets/purchase-list'
import { PlanningCalendar } from '@/widgets/planning-calendar'

const accounts = useAccountStore()
const purchases = usePurchaseStore()
const view = ref<'list' | 'month'>('list')

const viewOptions: { value: 'list' | 'month'; label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'month', label: 'Месяц' },
]

function openIncomeRule() {
  openFormDrawer({
    name: 'income-rule',
    accountId:
      accounts.selectedAccountId !== ALL_ACCOUNTS_ID ? accounts.selectedAccountId : undefined,
  })
}

const hasPlanned = computed(() => {
  if (accounts.selectedAccountId === ALL_ACCOUNTS_ID) {
    return purchases.planned.length > 0
  }
  return purchases.planned.some((item) => item.accountId === accounts.selectedAccountId)
})
</script>

<template>
  <div class="calendar">
    <div class="calendar__toolbar">
      <AppSegmented v-model="view" compact :options="viewOptions" aria-label="Вид планирования" />
    </div>
    <div v-if="hasPlanned || view === 'month'" class="calendar__cta" data-tour="calendar-cta">
      <AppButton block @click="openFormDrawer({ name: 'purchase-new' })">Новая покупка</AppButton>
      <AppButton variant="secondary" block @click="openIncomeRule">Авто-пополнение</AppButton>
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
</style>
