<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { AppButton, AppEmpty, AppPeriodSelect, openFormDrawer, todayLocal } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  formatPeriodLabel,
  statsDateRange,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import { TransactionList } from '@/widgets/transaction-list'

const CHART_PERIODS: ChartPeriod[] = ['day', 'week', 'month', 'year', 'custom', 'all']

const route = useRoute()
const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

function queryParam(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

function periodFromQuery(): ChartPeriod {
  const value = queryParam('period')
  return CHART_PERIODS.includes(value as ChartPeriod) ? (value as ChartPeriod) : 'month'
}

const period = ref<ChartPeriod>(periodFromQuery())
const customFrom = ref(queryParam('from') || todayLocal().slice(0, 8) + '01')
const customTo = ref(queryParam('to') || todayLocal())
const listKind = ref<'expense' | 'income' | undefined>(undefined)
const listCategoryId = ref<string | undefined>(undefined)

function applyQuery() {
  period.value = periodFromQuery()
  const from = queryParam('from')
  const to = queryParam('to')
  if (from) customFrom.value = from
  if (to) customTo.value = to
  const kind = queryParam('kind')
  listKind.value = kind === 'expense' || kind === 'income' ? kind : undefined
  listCategoryId.value = queryParam('category') || undefined
}

applyQuery()

watch(
  () => route.query,
  () => {
    applyQuery()
  },
)

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
      <div class="history__body" data-tour="history">
        <div class="history__toolbar">
          <AppPeriodSelect
            v-model="period"
            v-model:from="customFrom"
            v-model:to="customTo"
            :label="periodLabel"
            show-all
          />
        </div>

        <TransactionList
          :items="periodItems"
          :initial-kind="listKind"
          :initial-category-id="listCategoryId"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.history__toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>
