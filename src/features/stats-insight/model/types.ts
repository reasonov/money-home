export type InsightLeverKind = 'category_increase' | 'category_top' | 'large_operation' | 'forecast_dip'

export type InsightChartId = 'category' | 'top' | 'forecast'

export interface InsightLever {
  id: string
  kind: InsightLeverKind
  fact: string
  impact: number
  categoryId?: string
  groupId?: string
  categoryName?: string
  transactionId?: string
}

export interface InsightTip {
  id: string
  kind: InsightLeverKind
  title: string
  detail: string
  impact: number
  categoryId?: string
  groupId?: string
  categoryName?: string
  transactionId?: string
}

export interface StatsInsightResult {
  summary: string
  tips: InsightTip[]
}

export interface StatsInsightSummary {
  accountId: string
  period: string
  periodLabel: string
  scopeLabel: string
  from?: string
  to?: string
  hasPrevious: boolean
  currentExpense: number
  previousExpense: number
  currentIncome: number
  previousIncome: number
  levers: InsightLever[]
}
