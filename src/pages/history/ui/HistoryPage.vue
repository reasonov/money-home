<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AppEmpty, AppField, AppInput, AppSegmented, todayLocal } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { statsDateRange, useTransactionStore, type ChartPeriod } from '@/entities/transaction'
import { TransactionList } from '@/widgets/transaction-list'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

const period = ref<ChartPeriod>('month')
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())

const periodOptions: { value: ChartPeriod; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'custom', label: 'Период' },
]

watch(period, (value) => {
  if (value === 'custom' && !customFrom.value) {
    customFrom.value = todayLocal().slice(0, 8) + '01'
    customTo.value = todayLocal()
  }
})

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
    <AppEmpty v-if="!accounts.items.length" description="Пока нет счетов" />

    <template v-else>
      <AppSegmented v-model="period" :options="periodOptions" aria-label="Период" />

      <div v-if="period === 'custom'" class="range">
        <AppField label="С" for-id="history-from">
          <AppInput id="history-from" v-model="customFrom" type="date" />
        </AppField>
        <AppField label="По" for-id="history-to">
          <AppInput id="history-to" v-model="customTo" type="date" />
        </AppField>
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

.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
</style>
