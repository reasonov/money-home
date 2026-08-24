<script setup lang="ts">
import { computed } from 'vue'
import {
  AppHelpTip,
  availableUntilNextIncome,
  compareDates,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  parseLocalDate,
  todayLocal,
  transferProjectionForAccount,
  type AvailableUntilNextIncomeResult,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useTransactionStore } from '@/entities/transaction'
import { useTransferRuleStore } from '@/entities/transfer-rule'

const props = defineProps<{
  accountId?: string
  balance?: number
  compact?: boolean
}>()

const accounts = useAccountStore()
const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const purchases = usePurchaseStore()
const transactions = useTransactionStore()

function computeFor(accountId: string, balance: number): AvailableUntilNextIncomeResult {
  return availableUntilNextIncome({
    currentBalance: balance,
    asOfDate: parseLocalDate(todayLocal()),
    incomeRules: incomeRules.forAccount(accountId).filter((rule) => rule.active),
    plannedPurchases: purchases.plannedFor(accountId),
    postedOccurrenceDates: incomeRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    expenseRules: expenseRules.forAccount(accountId).filter((rule) => rule.active),
    postedExpenseOccurrenceDates: expenseRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
    ...transferProjectionForAccount(
      transferRules.items,
      accountId,
      (id) => transactions.transferOccurrenceDatesFor(id),
    ),
  })
}

const targets = computed(() => {
  if (props.accountId) {
    return [{ id: props.accountId, amount: props.balance ?? 0 }]
  }
  return accounts.items
    .filter((item) => !item.excludeFromTotal)
    .map((item) => ({ id: item.id, amount: item.amount }))
})

const result = computed(() => {
  let available = 0
  let plannedSpend = 0
  let nextIncomeDate: Date | null = null
  for (const target of targets.value) {
    const part = computeFor(target.id, target.amount)
    available += part.available
    plannedSpend += part.plannedSpend
    if (
      part.nextIncomeDate &&
      (!nextIncomeDate || compareDates(part.nextIncomeDate, nextIncomeDate) < 0)
    ) {
      nextIncomeDate = part.nextIncomeDate
    }
  }
  return { available, plannedSpend, nextIncomeDate }
})

const text = computed(() => {
  const next = result.value.nextIncomeDate
  const amount = formatMoney(result.value.available)
  if (next) {
    return `Доступно до ${formatShortDate(formatLocalDate(next))}: ${amount}`
  }
  return `Доступно с учётом плановых покупок: ${amount}`
})
</script>

<template>
  <span class="hint" :class="{ 'is-compact': compact }">
    {{ text }}
    <AppHelpTip
      v-if="!compact"
      text="Уже вычтены плановые покупки и регулярные расходы до следующего пополнения. Копилки деньги не резервируют."
    />
  </span>
</template>

<style scoped>
.hint {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.is-compact {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
