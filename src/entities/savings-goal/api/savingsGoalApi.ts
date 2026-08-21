import { getErrorMessage, roundMoney, supabase } from '@/shared'
import type { SavingsGoal, SavingsGoalStatus } from '../model/types'

export type SavingsGoalRow = {
  id: string
  account_id: string
  title: string
  target_amount: number
  target_date: string
  saved_amount: number
  started_on: string
  status: string
  created_by: string
  updated_by?: string | null
}

const SELECT =
  'id, account_id, title, target_amount, target_date, saved_amount, started_on, status, created_by, updated_by'

export function mapSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title.trim(),
    targetAmount: roundMoney(Number(row.target_amount)),
    targetDate: row.target_date,
    savedAmount: roundMoney(Number(row.saved_amount)),
    startedOn: row.started_on,
    status: row.status as SavingsGoalStatus,
    createdBy: row.created_by,
  }
}

export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select(SELECT)
    .order('target_date', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить копилки'))
  }
  return (data ?? []).map(mapSavingsGoal)
}

export async function insertSavingsGoal(input: {
  id?: string
  accountId: string
  title: string
  targetAmount: number
  targetDate: string
  savedAmount: number
  startedOn: string
  createdBy: string
}): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      account_id: input.accountId,
      title: input.title.trim(),
      target_amount: roundMoney(input.targetAmount),
      target_date: input.targetDate,
      saved_amount: roundMoney(input.savedAmount),
      started_on: input.startedOn,
      status: 'active',
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(SELECT)
    .single()

  if (error?.code === '23505' && input.id) {
    const existing = await supabase.from('savings_goals').select(SELECT).eq('id', input.id).single()
    if (existing.data) {
      return mapSavingsGoal(existing.data)
    }
  }

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить копилку'))
  }
  return mapSavingsGoal(data)
}

export async function updateSavingsGoalRow(
  id: string,
  userId: string,
  input: {
    title?: string
    targetAmount?: number
    targetDate?: string
    savedAmount?: number
    status?: SavingsGoalStatus
  },
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      ...(input.title != null ? { title: input.title.trim() } : {}),
      ...(input.targetAmount != null ? { target_amount: roundMoney(input.targetAmount) } : {}),
      ...(input.targetDate != null ? { target_date: input.targetDate } : {}),
      ...(input.savedAmount != null ? { saved_amount: roundMoney(input.savedAmount) } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      updated_by: userId,
    })
    .eq('id', id)
    .select(SELECT)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось изменить копилку'))
  }
  return mapSavingsGoal(data)
}

export async function deleteSavingsGoal(id: string, userId: string): Promise<void> {
  const { error: touchError } = await supabase
    .from('savings_goals')
    .update({ updated_by: userId })
    .eq('id', id)
  if (touchError) {
    throw new Error(getErrorMessage(touchError, 'Не удалось удалить копилку'))
  }
  const { error } = await supabase.from('savings_goals').delete().eq('id', id)
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить копилку'))
  }
}
