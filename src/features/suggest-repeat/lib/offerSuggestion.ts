import {
  confirmAction,
  getErrorMessage,
  openFormDrawer,
  showToast,
  type RuleFormDraft,
} from '@/shared'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useOperationTemplateStore } from '@/entities/operation-template'
import { useSessionStore } from '@/entities/session'
import {
  detectRepeatSuggestion,
  useTransactionStore,
  type RepeatSuggestion,
  type Transaction,
} from '@/entities/transaction'
import { repeatSuggestionMessage, repeatSuggestionTitle } from './copy'
import { bindRepeatDismissed, dismissedKeys, dismissRepeatKey } from './dismissed'

export async function acceptRepeatSuggestion(item: RepeatSuggestion) {
  if (item.type === 'rule') {
    const draft: RuleFormDraft = {
      accountId: item.accountId,
      amount: item.amount,
      frequency: item.frequency ?? 'monthly',
      ...(item.title ? { title: item.title } : {}),
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
      ...(item.weekday != null ? { weekday: item.weekday } : {}),
      ...(item.monthDay != null ? { monthDay: item.monthDay } : {}),
    }
    openFormDrawer({
      name: item.kind === 'income' ? 'income-rule' : 'expense-rule',
      accountId: item.accountId,
      draft,
    })
    return
  }
  await useOperationTemplateStore().save({
    kind: item.kind,
    categoryId: item.categoryId,
    amount: item.amount,
    title: item.title,
    notes: item.notes,
  })
  showToast('Добавлено в избранное')
}

export async function offerRepeatSuggestion(tx: Transaction) {
  const userId = useSessionStore().user?.id
  if (!userId) {
    return
  }
  bindRepeatDismissed(userId)
  const suggestion = detectRepeatSuggestion(useTransactionStore().posted, {
    seed: tx,
    rules: [...useIncomeRuleStore().items, ...useExpenseRuleStore().items],
    templates: useOperationTemplateStore().items,
    dismissedKeys: dismissedKeys.value,
  })
  if (!suggestion) {
    return
  }
  const ok = await confirmAction({
    title: repeatSuggestionTitle(suggestion),
    message: repeatSuggestionMessage(suggestion),
    confirmLabel: 'Добавить',
    cancelLabel: 'Не сейчас',
    kind: 'success',
  })
  if (!ok) {
    dismissRepeatKey(suggestion.key)
    return
  }
  try {
    await acceptRepeatSuggestion(suggestion)
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось сохранить'))
  }
}
