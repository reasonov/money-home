<script setup lang="ts">
import { computed } from 'vue'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { usePurchaseStore } from '@/entities/purchase'
import { AppButton, openFormDrawer } from '@/shared'
import { PurchaseList } from '@/widgets/purchase-list'

const accounts = useAccountStore()
const purchases = usePurchaseStore()

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
    <div v-if="hasPlanned" class="calendar__cta" data-tour="calendar-cta">
      <AppButton block @click="openFormDrawer({ name: 'purchase-new' })">Новая покупка</AppButton>
      <AppButton variant="secondary" block @click="openIncomeRule">Авто-пополнение</AppButton>
    </div>
    <PurchaseList />
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.calendar__cta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
</style>
