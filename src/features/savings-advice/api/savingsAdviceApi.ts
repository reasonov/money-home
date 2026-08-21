import { supabase } from '@/shared'
import { fallbackTipsFromLevers, leverTitle } from '../lib/buildAdviceLevers'
import type { SavingsAdviceSummary } from '../lib/summarizeSpending'
import type { SavingsAdviceResult, SavingsAdviceTip } from '../model/types'

export async function fetchSavingsAdvice(
  summary: SavingsAdviceSummary,
): Promise<SavingsAdviceResult> {
  const { data, error } = await supabase.functions.invoke<SavingsAdviceResult>('savings-advice', {
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
    throw error ?? new Error('empty advice')
  }
  return { summary: '', tips }
}

function hydrateTip(summary: SavingsAdviceSummary, tip: SavingsAdviceTip): SavingsAdviceTip {
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

function isTip(value: unknown): value is SavingsAdviceTip {
  if (!value || typeof value !== 'object') {
    return false
  }
  const tip = value as SavingsAdviceTip
  return (
    typeof tip.id === 'string' &&
    typeof tip.kind === 'string' &&
    typeof tip.title === 'string' &&
    typeof tip.detail === 'string'
  )
}
