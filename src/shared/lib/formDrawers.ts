import { computed, ref } from 'vue'
import { parseLocalDate } from './dates'

export type RuleFormDraft = {
  accountId: string
  amount: number
  title?: string
  categoryId?: string
  frequency: 'weekly' | 'monthly'
  weekday?: number
  monthDay?: number
}

export function ruleScheduleFromDate(iso: string) {
  const date = parseLocalDate(iso)
  const day = date.getDate()
  return {
    startsOn: iso,
    weekday: date.getDay(),
    monthDay: Math.min(Math.max(day, 1), 28),
  }
}

export type FormDrawerCloseReason = 'dismiss' | 'submit' | 'silent'

export const lastFormDrawerCloseReason = ref<FormDrawerCloseReason>('dismiss')

export type FormDrawer =
  | { name: 'expense'; accountId?: string }
  | { name: 'income'; accountId?: string }
  | { name: 'transfer'; fromAccountId?: string }
  | { name: 'account'; mode?: 'create' | 'join' }
  | { name: 'purchase-new'; plannedDate?: string }
  | { name: 'purchase-edit'; purchaseId: string }
  | { name: 'income-rule'; ruleId?: string; accountId?: string; draft?: RuleFormDraft; startsOn?: string }
  | { name: 'expense-rule'; ruleId?: string; accountId?: string; draft?: RuleFormDraft; startsOn?: string }
  | { name: 'transfer-rule'; ruleId?: string; fromAccountId?: string; startsOn?: string }
  | { name: 'transaction-edit'; transactionId: string }
  | { name: 'savings-goal'; accountId?: string; goalId?: string }
  | { name: 'savings-advice'; accountId: string; goalId: string }

export const formDrawer = ref<FormDrawer | null>(null)

export function openFormDrawer(drawer: FormDrawer) {
  formDrawer.value = drawer
}

export function closeFormDrawer(reason: FormDrawerCloseReason = 'dismiss') {
  if (formDrawer.value === null) {
    return
  }
  lastFormDrawerCloseReason.value =
    reason === 'submit' || reason === 'silent' ? reason : 'dismiss'
  formDrawer.value = null
}

export const formDrawerOpen = computed({
  get: () => formDrawer.value !== null,
  set: (open: boolean) => {
    if (!open) {
      closeFormDrawer('dismiss')
    }
  },
})
