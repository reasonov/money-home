import { computed, ref } from 'vue'

export type RuleFormDraft = {
  accountId: string
  amount: number
  title?: string
  categoryId?: string
  frequency: 'weekly' | 'monthly'
  weekday?: number
  monthDay?: number
}

export type FormDrawer =
  | { name: 'expense'; accountId?: string }
  | { name: 'income'; accountId?: string }
  | { name: 'transfer'; fromAccountId?: string }
  | { name: 'account'; mode?: 'create' | 'join' }
  | { name: 'purchase-new'; plannedDate?: string }
  | { name: 'purchase-edit'; purchaseId: string }
  | { name: 'income-rule'; ruleId?: string; accountId?: string; draft?: RuleFormDraft }
  | { name: 'expense-rule'; ruleId?: string; accountId?: string; draft?: RuleFormDraft }
  | { name: 'transaction-edit'; transactionId: string }
  | { name: 'savings-goal'; accountId?: string; goalId?: string }
  | { name: 'savings-advice'; accountId: string; goalId: string }

export const formDrawer = ref<FormDrawer | null>(null)

export function openFormDrawer(drawer: FormDrawer) {
  formDrawer.value = drawer
}

export function closeFormDrawer() {
  formDrawer.value = null
}

export const formDrawerOpen = computed({
  get: () => formDrawer.value !== null,
  set: (open: boolean) => {
    if (!open) {
      formDrawer.value = null
    }
  },
})
