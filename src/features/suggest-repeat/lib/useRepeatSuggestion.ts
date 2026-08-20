import { computed, watch } from 'vue'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { useOperationTemplateStore } from '@/entities/operation-template'
import { useSessionStore } from '@/entities/session'
import { detectRepeatSuggestions, useTransactionStore } from '@/entities/transaction'
import { bindRepeatDismissed, dismissedKeys, dismissRepeatKey } from './dismissed'
import { acceptRepeatSuggestion } from './offerSuggestion'

export function useRepeatSuggestion() {
  const session = useSessionStore()
  const accounts = useAccountStore()
  const transactions = useTransactionStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const templates = useOperationTemplateStore()

  watch(
    () => session.user?.id,
    (id) => {
      if (id) {
        bindRepeatDismissed(id)
      }
    },
    { immediate: true },
  )

  const suggestion = computed(() => {
    const userId = session.user?.id
    if (!userId) {
      return null
    }
    const accountId =
      accounts.selectedAccountId === ALL_ACCOUNTS_ID ? undefined : accounts.selectedAccountId
    return (
      detectRepeatSuggestions(transactions.posted, {
        accountId,
        rules: [...incomeRules.items, ...expenseRules.items],
        templates: templates.items,
        dismissedKeys: dismissedKeys.value,
      })[0] ?? null
    )
  })

  function dismiss() {
    if (suggestion.value) {
      dismissRepeatKey(suggestion.value.key)
    }
  }

  async function accept() {
    if (!suggestion.value) {
      return
    }
    await acceptRepeatSuggestion(suggestion.value)
  }

  return { suggestion, dismiss, accept }
}
