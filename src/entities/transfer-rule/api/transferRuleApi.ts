import { getErrorMessage, roundMoney, supabase, type IncomeFrequency } from '@/shared'
import type { TransferRule } from '../model/types'

type TransferRuleRow = {
  id: string
  from_account_id: string
  to_account_id: string
  amount: number
  frequency: string
  weekday: number | null
  month_day: number | null
  anchor_date: string | null
  title: string | null
  active: boolean
  starts_on?: string
}

export function mapTransferRule(row: TransferRuleRow): TransferRule {
  const title = row.title?.trim()
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: roundMoney(Number(row.amount)),
    frequency: row.frequency as IncomeFrequency,
    active: row.active,
    ...(row.starts_on ? { startsOn: row.starts_on } : {}),
    ...(row.weekday != null ? { weekday: row.weekday } : {}),
    ...(row.month_day != null ? { monthDay: row.month_day } : {}),
    ...(row.anchor_date ? { anchorDate: row.anchor_date } : {}),
    ...(title ? { title } : {}),
  }
}

const SELECT =
  'id, from_account_id, to_account_id, amount, frequency, weekday, month_day, anchor_date, title, active, starts_on'

export async function fetchTransferRules(): Promise<TransferRule[]> {
  const { data, error } = await supabase.from('transfer_rules').select(SELECT).order('created_at')
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить регулярные переводы'))
  }
  return (data ?? []).map(mapTransferRule)
}

function toRow(input: Omit<TransferRule, 'id'>, userId: string, id?: string) {
  return {
    ...(id ? { id } : {}),
    from_account_id: input.fromAccountId,
    to_account_id: input.toAccountId,
    amount: roundMoney(input.amount),
    frequency: input.frequency,
    weekday: input.weekday ?? null,
    month_day: input.monthDay ?? null,
    anchor_date: input.anchorDate ?? null,
    title: input.title?.trim() || null,
    active: input.active,
    ...(input.startsOn ? { starts_on: input.startsOn } : {}),
    updated_by: userId,
  }
}

export async function insertTransferRule(
  userId: string,
  input: Omit<TransferRule, 'id'> & { id?: string },
): Promise<TransferRule> {
  const { data, error } = await supabase
    .from('transfer_rules')
    .insert(toRow(input, userId, input.id))
    .select(SELECT)
    .single()
  if (error?.code === '23505' && input.id) {
    const existing = await supabase.from('transfer_rules').select(SELECT).eq('id', input.id).single()
    if (existing.data) {
      return mapTransferRule(existing.data)
    }
  }
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось добавить правило'))
  }
  return mapTransferRule(data)
}

export async function updateTransferRule(
  id: string,
  userId: string,
  patch: Partial<Omit<TransferRule, 'id'>>,
): Promise<TransferRule> {
  const payload: {
    updated_by: string
    from_account_id?: string
    to_account_id?: string
    amount?: number
    frequency?: string
    active?: boolean
    weekday?: number | null
    month_day?: number | null
    anchor_date?: string | null
    title?: string | null
  } = { updated_by: userId }
  if (patch.fromAccountId != null) payload.from_account_id = patch.fromAccountId
  if (patch.toAccountId != null) payload.to_account_id = patch.toAccountId
  if (patch.amount != null) payload.amount = roundMoney(patch.amount)
  if (patch.frequency != null) payload.frequency = patch.frequency
  if (patch.active != null) payload.active = patch.active
  if ('weekday' in patch) payload.weekday = patch.weekday ?? null
  if ('monthDay' in patch) payload.month_day = patch.monthDay ?? null
  if ('anchorDate' in patch) payload.anchor_date = patch.anchorDate ?? null
  if ('title' in patch) payload.title = patch.title?.trim() || null

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

  const { data, error } = await supabase.from('transfer_rules').update(payload).eq('id', id).select(SELECT).single()
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить правило'))
  }
  return mapTransferRule(data)
}

export async function deleteTransferRule(id: string, userId: string): Promise<void> {
  const { error: touchError } = await supabase.from('transfer_rules').update({ updated_by: userId }).eq('id', id)
  if (touchError) {
    throw new Error(getErrorMessage(touchError, 'Не удалось удалить правило'))
  }
  const { error } = await supabase.from('transfer_rules').delete().eq('id', id)
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить правило'))
  }
}
