import { parseLocalDate, type RuleFormDraft } from '@/shared'

export type RuleDraftSource = {
  accountId: string
  amount: number
  occurredOn: string
  title?: string
  categoryId?: string
}

export function ruleDraftFromOperation(source: RuleDraftSource): RuleFormDraft {
  const date = parseLocalDate(source.occurredOn)
  const monthDay = date.getDate()
  const title = source.title?.trim()
  const categoryId = source.categoryId?.trim()

  const draft: RuleFormDraft = {
    accountId: source.accountId,
    amount: source.amount,
    frequency: monthDay <= 28 ? 'monthly' : 'weekly',
    ...(title ? { title } : {}),
    ...(categoryId ? { categoryId } : {}),
  }

  if (draft.frequency === 'monthly') {
    draft.monthDay = monthDay
  } else {
    draft.weekday = date.getDay()
  }

  return draft
}
