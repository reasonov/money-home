<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { AppButton, AppEmpty, AppPeriodSelect, openFormDrawer, todayLocal } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  formatPeriodLabel,
  statsDateRange,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import { TransactionList } from '@/widgets/transaction-list'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

const period = ref<ChartPeriod>('month')
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())

const periodLabel = computed(() =>
  formatPeriodLabel(period.value, undefined, {
    from: customFrom.value,
    to: customTo.value,
  }),
)

const periodItems = computed(() => {
  const range = statsDateRange(period.value, undefined, {
    from: customFrom.value,
    to: customTo.value,
  })
  return transactions.posted.filter((item) => {
    if (
      selectedAccountId.value !== ALL_ACCOUNTS_ID &&
      item.accountId !== selectedAccountId.value &&
      item.counterpartyAccountId !== selectedAccountId.value
    ) {
      return false
    }
    if (range.from && item.occurredOn < range.from) {
      return false
    }
    if (range.to && item.occurredOn > range.to) {
      return false
    }
    return true
  })
})
</script>

<template>
  <div class="history">
    <AppEmpty v-if="!accounts.items.length" description="Создайте счёт, чтобы сохранять операции">
      <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
    </AppEmpty>

    <template v-else>
      <div class="history__toolbar">
        <AppPeriodSelect
          v-model="period"
          v-model:from="customFrom"
          v-model:to="customTo"
          :label="periodLabel"
        />
      </div>

      <TransactionList :items="periodItems" />
    </template>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history__toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>
