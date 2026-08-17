<script setup lang="ts">
import { computed } from 'vue'
import {
  availableUntilNextIncome,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  parseLocalDate,
  todayLocal,
} from '@/shared'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'

const props = defineProps<{
  accountId: string
  balance: number
  compact?: boolean
}>()

const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const purchases = usePurchaseStore()
const transactions = useTransactionStore()

const result = computed(() =>
  availableUntilNextIncome({
    currentBalance: props.balance,
    asOfDate: parseLocalDate(todayLocal()),
    incomeRules: incomeRules.forAccount(props.accountId).filter((rule) => rule.active),
    plannedPurchases: purchases.plannedFor(props.accountId),
    postedOccurrenceDates: incomeRules
      .forAccount(props.accountId)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    expenseRules: expenseRules.forAccount(props.accountId).filter((rule) => rule.active),
    postedExpenseOccurrenceDates: expenseRules
      .forAccount(props.accountId)
      .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
  }),
)

const text = computed(() => {
  const next = result.value.nextIncomeDate
  const amount = formatMoney(result.value.available)
  if (next) {
    return `до ${formatShortDate(formatLocalDate(next))} · ${amount}`
  }
  return `свободно с учётом планов · ${amount}`
})
</script>

<template>
  <span class="hint" :class="{ 'is-compact': compact }">{{ text }}</span>
</template>

<style scoped>
.hint {
  display: block;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.is-compact {
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
