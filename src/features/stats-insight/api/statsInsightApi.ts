import { supabase } from '@/shared'
import { fallbackInsightSummary, fallbackTipsFromLevers, leverTitle } from '../lib/buildInsightLevers'
import type { InsightTip, StatsInsightResult, StatsInsightSummary } from '../model/types'

export async function fetchStatsInsight(summary: StatsInsightSummary): Promise<StatsInsightResult> {
  const { data, error } = await supabase.functions.invoke<StatsInsightResult>('stats-insight', {
    body: { accountId: summary.accountId, summary },
  })
  if (!error) {
    const tips = Array.isArray(data?.tips)
      ? data.tips.filter(isTip).map((tip) => hydrateTip(summary, tip))
      : []
    const text = typeof data?.summary === 'string' ? data.summary.trim() : ''
    if (tips.length || text) {
      return { summary: text, tips }
    }
  }
  const tips = fallbackTipsFromLevers(summary.levers)
  if (!tips.length) {
    throw error ?? new Error('empty insight')
  }
  return {
    summary: fallbackInsightSummary({
      hasPrevious: summary.hasPrevious,
      currentExpense: summary.currentExpense,
      previousExpense: summary.previousExpense,
      scopeLabel: summary.scopeLabel,
    }),
    tips,
  }
}

function hydrateTip(summary: StatsInsightSummary, tip: InsightTip): InsightTip {
  const lever = summary.levers.find((item) => item.id === tip.id)
  if (!lever) {
    return tip
  }
  const base = fallbackTipsFromLevers([lever])[0]
  return {
    ...base!,
    title: tip.title.trim() || leverTitle(lever),
    detail: tip.detail.trim() || lever.fact,
  }
}

function isTip(value: unknown): value is InsightTip {
  if (!value || typeof value !== 'object') {
    return false
  }
  const tip = value as InsightTip
  return (
    typeof tip.id === 'string' &&
    typeof tip.kind === 'string' &&
    typeof tip.title === 'string' &&
    typeof tip.detail === 'string'
  )
}
