import { getErrorMessage, roundMoney, supabase, type IncomeFrequency } from '@/shared'
import type { IncomeRule } from '../model/types'

type IncomeRuleRow = {
  id: string
  account_id: string
  amount: number
  frequency: string
  weekday: number | null
  month_day: number | null
  anchor_date: string | null
  title: string | null
  category_id: string | null
  active: boolean
  starts_on?: string
}

export function mapIncomeRule(row: IncomeRuleRow): IncomeRule {
  const title = row.title?.trim()
  return {
    id: row.id,
    accountId: row.account_id,
    amount: roundMoney(Number(row.amount)),
    frequency: row.frequency as IncomeFrequency,
    active: row.active,
    ...(row.starts_on ? { startsOn: row.starts_on } : {}),
    ...(row.weekday != null ? { weekday: row.weekday } : {}),
    ...(row.month_day != null ? { monthDay: row.month_day } : {}),
    ...(row.anchor_date ? { anchorDate: row.anchor_date } : {}),
    ...(title ? { title } : {}),
    ...(row.category_id ? { categoryId: row.category_id } : {}),
  }
}

const SELECT =
  'id, account_id, amount, frequency, weekday, month_day, anchor_date, title, category_id, active, starts_on'

export async function fetchIncomeRules(): Promise<IncomeRule[]> {
  const { data, error } = await supabase.from('income_rules').select(SELECT).order('created_at')
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить пополнения'))
  }
  return (data ?? []).map(mapIncomeRule)
}

function toRow(input: Omit<IncomeRule, 'id'>, userId: string, id?: string) {
  return {
    ...(id ? { id } : {}),
    account_id: input.accountId,
    amount: roundMoney(input.amount),
    frequency: input.frequency,
    weekday: input.weekday ?? null,
    month_day: input.monthDay ?? null,
    anchor_date: input.anchorDate ?? null,
    title: input.title?.trim() || null,
    category_id: input.categoryId ?? null,
    active: input.active,
    ...(input.startsOn ? { starts_on: input.startsOn } : {}),
    updated_by: userId,
  }
}

export async function insertIncomeRule(
  userId: string,
  input: Omit<IncomeRule, 'id'> & { id?: string },
): Promise<IncomeRule> {
  const { data, error } = await supabase
    .from('income_rules')
    .insert(toRow(input, userId, input.id))
    .select(SELECT)
    .single()
  if (error?.code === '23505' && input.id) {
    const existing = await supabase.from('income_rules').select(SELECT).eq('id', input.id).single()
    if (existing.data) {
      return mapIncomeRule(existing.data)
    }
  }
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось добавить правило'))
  }
  return mapIncomeRule(data)
}

export async function updateIncomeRule(
  id: string,
  userId: string,
  patch: Partial<Omit<IncomeRule, 'id'>>,
): Promise<IncomeRule> {
  const payload: {
    updated_by: string
    account_id?: string
    amount?: number
    frequency?: string
    active?: boolean
    weekday?: number | null
    month_day?: number | null
    anchor_date?: string | null
    title?: string | null
    category_id?: string | null
  } = { updated_by: userId }
  if (patch.accountId != null) payload.account_id = patch.accountId
  if (patch.amount != null) payload.amount = roundMoney(patch.amount)
  if (patch.frequency != null) payload.frequency = patch.frequency
  if (patch.active != null) payload.active = patch.active
  if ('weekday' in patch) payload.weekday = patch.weekday ?? null
  if ('monthDay' in patch) payload.month_day = patch.monthDay ?? null
  if ('anchorDate' in patch) payload.anchor_date = patch.anchorDate ?? null
  if ('title' in patch) payload.title = patch.title?.trim() || null
  if ('categoryId' in patch) payload.category_id = patch.categoryId ?? null

  if (patch.frequency === 'monthly') {
    payload.weekday = null
    payload.anchor_date = null
  }
  if (patch.frequency === 'weekly') {
    payload.month_day = null
    payload.anchor_date = null
  }
  if (patch.frequency === 'biweekly') {
    payload.month_day = null
  }

  const { data, error } = await supabase.from('income_rules').update(payload).eq('id', id).select(SELECT).single()
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить правило'))
  }
  return mapIncomeRule(data)
}

export async function deleteIncomeRule(id: string, userId: string): Promise<void> {
  const { error: touchError } = await supabase.from('income_rules').update({ updated_by: userId }).eq('id', id)
  if (touchError) {
    throw new Error(getErrorMessage(touchError, 'Не удалось удалить правило'))
  }
  const { error } = await supabase.from('income_rules').delete().eq('id', id)
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить правило'))
  }
}
