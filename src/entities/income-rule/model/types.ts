import type { IncomeFrequency } from '@/shared'

export interface IncomeRule {
  id: string
  accountId: string
  amount: number
  frequency: IncomeFrequency
  weekday?: number
  monthDay?: number
  anchorDate?: string
  title?: string
  categoryId?: string
  active: boolean
}
