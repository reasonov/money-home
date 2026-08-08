import { getErrorMessage, supabase } from '@/shared'
import type { Purchase, PurchaseStatus } from '../model/types'

type PurchaseRow = {
  id: string
  title: string
  amount: number
  planned_date: string
  notes: string | null
  status: string
  created_by: string
}

export function mapPurchase(row: PurchaseRow): Purchase {
  const notes = row.notes?.trim()
  return {
    id: row.id,
    title: row.title,
    amount: Math.round(Number(row.amount)),
    plannedDate: row.planned_date,
    status: row.status as PurchaseStatus,
    createdBy: row.created_by,
    ...(notes ? { notes } : {}),
  }
}

export async function fetchPurchases(householdId: string): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id, title, amount, planned_date, notes, status, created_by')
    .eq('household_id', householdId)
    .order('planned_date', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить покупки'))
  }
  return (data ?? []).map(mapPurchase)
}

export async function insertPurchase(input: {
  householdId: string
  title: string
  amount: number
  plannedDate: string
  notes?: string
  createdBy: string
}): Promise<Purchase> {
  const notes = input.notes?.trim() || null
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      household_id: input.householdId,
      title: input.title.trim(),
      amount: Math.round(input.amount),
      planned_date: input.plannedDate,
      notes,
      status: 'planned',
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select('id, title, amount, planned_date, notes, status, created_by')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить покупку'))
  }
  return mapPurchase(data)
}

export async function updatePurchaseRow(
  id: string,
  userId: string,
  input: {
    title: string
    amount: number
    plannedDate: string
    notes?: string
  },
): Promise<Purchase> {
  const notes = input.notes?.trim() || null
  const { data, error } = await supabase
    .from('purchases')
    .update({
      title: input.title.trim(),
      amount: Math.round(input.amount),
      planned_date: input.plannedDate,
      notes,
      updated_by: userId,
    })
    .eq('id', id)
    .select('id, title, amount, planned_date, notes, status, created_by')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось изменить покупку'))
  }
  return mapPurchase(data)
}

export async function cancelPurchase(id: string, userId: string): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .update({
      status: 'cancelled',
      updated_by: userId,
    })
    .eq('id', id)
    .select('id, title, amount, planned_date, notes, status, created_by')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось отменить покупку'))
  }
  return mapPurchase(data)
}

export async function completePurchase(id: string): Promise<Purchase> {
  const { data, error } = await supabase.rpc('complete_purchase', { p_purchase_id: id }).single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось завершить покупку'))
  }
  return mapPurchase(data)
}
