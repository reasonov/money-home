import type { IncomeFrequency } from '@/shared'

export interface TransferRule {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  frequency: IncomeFrequency
  startsOn?: string
  weekday?: number
  monthDay?: number
  anchorDate?: string
  title?: string
  active: boolean
}
