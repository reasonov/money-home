<script setup lang="ts">
import { computed } from 'vue'
import {
  AppHelpTip,
  availableUntilAcrossAccounts,
  availableUntilNextIncome,
  formatLocalDate,
  formatMoney,
  formatShortDate,
  parseLocalDate,
  todayLocal,
  transferProjectionForAccount,
  type AccountAvailableSlice,
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

function sliceFor(accountId: string, balance: number): AccountAvailableSlice {
  return {
    id: accountId,
    currentBalance: balance,
    incomeRules: incomeRules.forAccount(accountId).filter((rule) => rule.active),
    plannedPurchases: purchases.plannedFor(accountId),
    postedOccurrenceDates: incomeRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.occurrenceDatesFor(rule.id)),
    expenseRules: expenseRules.forAccount(accountId).filter((rule) => rule.active),
    postedExpenseOccurrenceDates: expenseRules
      .forAccount(accountId)
      .flatMap((rule) => transactions.expenseOccurrenceDatesFor(rule.id)),
  }
}

const result = computed(() => {
  const asOfDate = parseLocalDate(todayLocal())
  if (props.accountId) {
    const slice = sliceFor(props.accountId, props.balance ?? 0)
    return availableUntilNextIncome({
      currentBalance: slice.currentBalance,
      asOfDate,
      incomeRules: slice.incomeRules,
      plannedPurchases: slice.plannedPurchases,
      postedOccurrenceDates: slice.postedOccurrenceDates,
      expenseRules: slice.expenseRules,
      postedExpenseOccurrenceDates: slice.postedExpenseOccurrenceDates,
      ...transferProjectionForAccount(
        transferRules.items,
        props.accountId,
        (id) => transactions.transferOccurrenceDatesFor(id),
      ),
    })
  }
  const slices = accounts.items
    .filter((item) => !item.excludeFromTotal)
    .map((item) => sliceFor(item.id, item.amount))
  return availableUntilAcrossAccounts(
    asOfDate,
    slices,
    transferRules.items,
    (id) => transactions.transferOccurrenceDatesFor(id),
  )
})

const text = computed(() => {
  const next = result.value.nextIncomeDate
  const amount = formatMoney(result.value.available)
  if (props.compact) {
    if (next) {
      return `Доступно ${amount} · до ${formatShortDate(formatLocalDate(next))}`
    }
    return `Доступно ${amount}`
  }
  if (next) {
    return `Доступно до ${formatShortDate(formatLocalDate(next))}: ${amount}`
  }
  return `Доступно с учётом плановых покупок: ${amount}`
})

const helpText = computed(() =>
  props.accountId
    ? 'Уже вычтены плановые покупки и регулярные расходы до следующего пополнения. Копилки деньги не резервируют.'
    : 'Уже вычтены плановые покупки и регулярные расходы до ближайшего пополнения. Переводы между этими счетами не вычитаются. Копилки деньги не резервируют.',
)
</script>

<template>
  <span class="hint" :class="{ 'is-compact': compact }">
    {{ text }}
    <AppHelpTip v-if="!compact" :text="helpText" />
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
