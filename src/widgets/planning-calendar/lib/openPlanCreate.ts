import { openFormDrawer } from '@/shared'
import type { PlanEvent } from './usePlanEvents'

export type PlanAddKind = 'purchase' | 'income' | 'expense' | 'transfer'

export const PLAN_ADD_OPTIONS: { label: string; key: PlanAddKind }[] = [
  { label: 'Покупка', key: 'purchase' },
  { label: 'Пополнение', key: 'income' },
  { label: 'Расход', key: 'expense' },
  { label: 'Перевод', key: 'transfer' },
]

export function isPlanAddKind(value: unknown): value is PlanAddKind {
  return value === 'purchase' || value === 'income' || value === 'expense' || value === 'transfer'
}

export function openPlanCreate(kind: PlanAddKind, date?: string) {
  if (kind === 'purchase') {
    openFormDrawer({ name: 'purchase-new', ...(date ? { plannedDate: date } : {}) })
    return
  }
  if (kind === 'income') {
    openFormDrawer({ name: 'income-rule', ...(date ? { startsOn: date } : {}) })
    return
  }
  if (kind === 'expense') {
    openFormDrawer({ name: 'expense-rule', ...(date ? { startsOn: date } : {}) })
    return
  }
  openFormDrawer({ name: 'transfer-rule', ...(date ? { startsOn: date } : {}) })
}

export function openPlanEvent(item: PlanEvent) {
  if (item.purchaseId) {
    openFormDrawer({ name: 'purchase-edit', purchaseId: item.purchaseId })
    return
  }
  if (!item.ruleId) {
    return
  }
  if (item.kind === 'income') {
    openFormDrawer({ name: 'income-rule', ruleId: item.ruleId })
    return
  }
  if (item.kind === 'expense') {
    openFormDrawer({ name: 'expense-rule', ruleId: item.ruleId })
    return
  }
  openFormDrawer({ name: 'transfer-rule', ruleId: item.ruleId })
}
