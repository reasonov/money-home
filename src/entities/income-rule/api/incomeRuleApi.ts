import { getErrorMessage, supabase, type IncomeFrequency } from '@/shared'
import type { IncomeRule } from '../model/types'

type IncomeRuleRow = {
  id: string
  amount: number
  frequency: string
  weekday: number | null
  month_day: number | null
  anchor_date: string | null
  active: boolean
}

export function mapIncomeRule(row: IncomeRuleRow): IncomeRule {
  return {
    id: row.id,
    amount: Math.round(Number(row.amount)),
    frequency: row.frequency as IncomeFrequency,
    active: row.active,
    ...(row.weekday != null ? { weekday: row.weekday } : {}),
    ...(row.month_day != null ? { monthDay: row.month_day } : {}),
    ...(row.anchor_date ? { anchorDate: row.anchor_date } : {}),
  }
}

export async function fetchIncomeRules(householdId: string): Promise<IncomeRule[]> {
  const { data, error } = await supabase
    .from('income_rules')
    .select('id, amount, frequency, weekday, month_day, anchor_date, active')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить пополнения'))
  }
  return (data ?? []).map(mapIncomeRule)
}

function toRow(input: Omit<IncomeRule, 'id'>, householdId: string, userId: string) {
  return {
    household_id: householdId,
    amount: Math.round(input.amount),
    frequency: input.frequency,
    weekday: input.weekday ?? null,
    month_day: input.monthDay ?? null,
    anchor_date: input.anchorDate ?? null,
    active: input.active,
    updated_by: userId,
  }
}

export async function insertIncomeRule(
  householdId: string,
  userId: string,
  input: Omit<IncomeRule, 'id'>,
): Promise<IncomeRule> {
  const { data, error } = await supabase
    .from('income_rules')
    .insert(toRow(input, householdId, userId))
    .select('id, amount, frequency, weekday, month_day, anchor_date, active')
    .single()

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
    amount?: number
    frequency?: string
    active?: boolean
    weekday?: number | null
    month_day?: number | null
    anchor_date?: string | null
  } = {
    updated_by: userId,
  }
  if (patch.amount != null) payload.amount = Math.round(patch.amount)
  if (patch.frequency != null) payload.frequency = patch.frequency
  if (patch.active != null) payload.active = patch.active
  if ('weekday' in patch) payload.weekday = patch.weekday ?? null
  if ('monthDay' in patch) payload.month_day = patch.monthDay ?? null
  if ('anchorDate' in patch) payload.anchor_date = patch.anchorDate ?? null

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

  const { data, error } = await supabase
    .from('income_rules')
    .update(payload)
    .eq('id', id)
    .select('id, amount, frequency, weekday, month_day, anchor_date, active')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить правило'))
  }
  return mapIncomeRule(data)
}

export async function deleteIncomeRule(id: string, userId: string): Promise<void> {
  const { error: touchError } = await supabase
    .from('income_rules')
    .update({ updated_by: userId })
    .eq('id', id)

  if (touchError) {
    throw new Error(getErrorMessage(touchError, 'Не удалось удалить правило'))
  }

  const { error } = await supabase.from('income_rules').delete().eq('id', id)
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить правило'))
  }
}
