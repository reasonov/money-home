import type { IncomeFrequency } from '@/shared'

export interface IncomeRule {
  id: string
  amount: number
  frequency: IncomeFrequency
  weekday?: number
  monthDay?: number
  anchorDate?: string
  active: boolean
}
