import { getErrorMessage, supabase } from '@/shared'
import type { Purchase, PurchaseStatus } from '../model/types'

type PurchaseRow = {
  id: string
  account_id: string
  category_id: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  title: string
  amount: number
  planned_date: string
  notes: string | null
  status: string
  created_by: string
}

const SELECT =
  'id, account_id, category_id, category_name, category_color, category_icon, title, amount, planned_date, notes, status, created_by'

export function mapPurchase(row: PurchaseRow): Purchase {
  const notes = row.notes?.trim()
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title,
    amount: Math.round(Number(row.amount)),
    plannedDate: row.planned_date,
    status: row.status as PurchaseStatus,
    createdBy: row.created_by,
    ...(row.category_id ? { categoryId: row.category_id } : {}),
    ...(row.category_name ? { categoryName: row.category_name } : {}),
    ...(row.category_color ? { categoryColor: row.category_color } : {}),
    ...(row.category_icon ? { categoryIcon: row.category_icon } : {}),
    ...(notes ? { notes } : {}),
  }
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(SELECT)
    .order('planned_date', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить покупки'))
  }
  return (data ?? []).map(mapPurchase)
}

export async function insertPurchase(input: {
  id?: string
  accountId: string
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  title: string
  amount: number
  plannedDate: string
  notes?: string
  createdBy: string
}): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      account_id: input.accountId,
      category_id: input.categoryId,
      category_name: input.categoryName,
      category_color: input.categoryColor,
      category_icon: input.categoryIcon,
      title: input.title.trim(),
      amount: Math.round(input.amount),
      planned_date: input.plannedDate,
      notes: input.notes?.trim() || null,
      status: 'planned',
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(SELECT)
    .single()

  if (error?.code === '23505' && input.id) {
    const existing = await supabase.from('purchases').select(SELECT).eq('id', input.id).single()
    if (existing.data) {
      return mapPurchase(existing.data)
    }
  }

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить покупку'))
  }
  return mapPurchase(data)
}

export async function updatePurchaseRow(
  id: string,
  userId: string,
  input: {
    accountId: string
    categoryId: string
    categoryName: string
    categoryColor: string
    categoryIcon: string
    title: string
    amount: number
    plannedDate: string
    notes?: string
  },
): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .update({
      account_id: input.accountId,
      category_id: input.categoryId,
      category_name: input.categoryName,
      category_color: input.categoryColor,
      category_icon: input.categoryIcon,
      title: input.title.trim(),
      amount: Math.round(input.amount),
      planned_date: input.plannedDate,
      notes: input.notes?.trim() || null,
      updated_by: userId,
    })
    .eq('id', id)
    .eq('status', 'planned')
    .select(SELECT)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось изменить покупку'))
  }
  return mapPurchase(data)
}

export async function cancelPurchase(id: string, userId: string): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .update({ status: 'cancelled', updated_by: userId })
    .eq('id', id)
    .eq('status', 'planned')
    .select(SELECT)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось отменить покупку'))
  }
  return mapPurchase(data)
}

export async function completePurchase(id: string, transactionId?: string): Promise<Purchase> {
  const { data, error } = await supabase
    .rpc('complete_purchase', {
      p_purchase_id: id,
      ...(transactionId ? { p_transaction_id: transactionId } : {}),
    })
    .single()
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось завершить покупку'))
  }
  return mapPurchase(data)
}
