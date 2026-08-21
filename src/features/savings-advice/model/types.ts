import type { AdviceLeverKind } from '../lib/buildAdviceLevers'

export type SavingsAdviceTip = {
  id: string
  kind: AdviceLeverKind
  title: string
  detail: string
  impact: number
  categoryName?: string
  categoryId?: string
  purchaseId?: string
  ruleId?: string
  newTargetDate?: string
}

export type SavingsAdviceResult = {
  summary: string
  tips: SavingsAdviceTip[]
}
