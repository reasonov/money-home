import { getErrorMessage, supabase } from '@/shared'
import type { Category, CategoryKind } from '../model/types'

type CategoryRow = {
  id: string
  kind: string
  name: string
  color: string
  icon: string
  category_accounts: { account_id: string }[] | null
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    kind: row.kind as CategoryKind,
    name: row.name,
    color: row.color,
    icon: row.icon,
    accountIds: (row.category_accounts ?? []).map((item) => item.account_id),
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, name, color, icon, category_accounts(account_id)')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить категории'))
  }
  return ((data ?? []) as unknown as CategoryRow[]).map(mapCategory)
}

export async function upsertCategory(input: {
  id?: string
  kind: CategoryKind
  name: string
  color: string
  icon: string
  accountIds: string[]
}): Promise<Category> {
  const { data, error } = await supabase.rpc(
    'upsert_category',
    input.id
      ? {
          p_kind: input.kind,
          p_name: input.name,
          p_color: input.color,
          p_icon: input.icon,
          p_account_ids: input.accountIds,
          p_id: input.id,
        }
      : {
          p_kind: input.kind,
          p_name: input.name,
          p_color: input.color,
          p_icon: input.icon,
          p_account_ids: input.accountIds,
        },
  )

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить категорию'))
  }

  return {
    id: data.id,
    kind: data.kind as CategoryKind,
    name: data.name,
    color: data.color,
    icon: data.icon,
    accountIds: input.accountIds,
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_category', { p_id: id })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить категорию'))
  }
}
