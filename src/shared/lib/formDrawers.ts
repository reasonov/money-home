import { computed, ref } from 'vue'

export type FormDrawer =
  | { name: 'expense'; accountId?: string }
  | { name: 'income'; accountId?: string }
  | { name: 'transfer'; fromAccountId?: string }
  | { name: 'account'; mode?: 'create' | 'join' }
  | { name: 'purchase-new'; plannedDate?: string }
  | { name: 'purchase-edit'; purchaseId: string }
  | { name: 'income-rule'; ruleId?: string; accountId?: string }
  | { name: 'expense-rule'; ruleId?: string; accountId?: string }
  | { name: 'transaction-edit'; transactionId: string }

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
