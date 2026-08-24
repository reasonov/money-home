import { getErrorMessage, supabase } from '@/shared'
import type { Category, CategoryGroup, CategoryKind } from '../model/types'

type CategoryRow = {
  id: string
  kind: string
  name: string
  color: string
  icon: string
  group_id: string | null
  color_manual: boolean | null
  sort_order: number | null
  category_accounts: { account_id: string }[] | null
}

type GroupRow = {
  id: string
  kind: string
  name: string
  color: string
  icon: string
  sort_order: number | null
  category_group_accounts: { account_id: string }[] | null
}

export type CategoryCatalog = {
  categories: Category[]
  groups: CategoryGroup[]
}

function mapGroup(row: GroupRow): CategoryGroup {
  return {
    id: row.id,
    kind: row.kind as CategoryKind,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order ?? 0,
    accountIds: (row.category_group_accounts ?? []).map((item) => item.account_id),
  }
}

export function mapCategory(row: CategoryRow, groupsById: Map<string, CategoryGroup>): Category {
  const groupId = row.group_id ?? undefined
  const group = groupId ? groupsById.get(groupId) : undefined
  const ownAccounts = (row.category_accounts ?? []).map((item) => item.account_id)
  return {
    id: row.id,
    kind: row.kind as CategoryKind,
    name: row.name,
    color: row.color,
    icon: row.icon,
    groupId,
    colorManual: Boolean(row.color_manual),
    sortOrder: row.sort_order ?? 0,
    accountIds: group ? [...group.accountIds] : ownAccounts,
  }
}

export async function fetchCategoryCatalog(): Promise<CategoryCatalog> {
  const [groupsRes, catsRes] = await Promise.all([
    supabase
      .from('category_groups')
      .select('id, kind, name, color, icon, sort_order, category_group_accounts(account_id)')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select(
        'id, kind, name, color, icon, group_id, color_manual, sort_order, category_accounts(account_id)',
      )
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ])

  if (groupsRes.error) {
    throw new Error(getErrorMessage(groupsRes.error, 'Не удалось загрузить группы категорий'))
  }
  if (catsRes.error) {
    throw new Error(getErrorMessage(catsRes.error, 'Не удалось загрузить категории'))
  }

  const groups = ((groupsRes.data ?? []) as unknown as GroupRow[]).map(mapGroup)
  const groupsById = new Map(groups.map((item) => [item.id, item]))
  const categories = ((catsRes.data ?? []) as unknown as CategoryRow[]).map((row) =>
    mapCategory(row, groupsById),
  )
  return { categories, groups }
}

export async function fetchCategories(): Promise<Category[]> {
  const catalog = await fetchCategoryCatalog()
  return catalog.categories
}

export type UpsertCategoryInput = {
  id?: string
  kind: CategoryKind
  name: string
  color: string
  icon: string
  accountIds: string[]
  groupId?: string | null
  colorManual?: boolean
  sortOrder?: number
}

export async function upsertCategory(input: UpsertCategoryInput): Promise<Category> {
  const grouped = Boolean(input.groupId)
  const { data, error } = await supabase.rpc(
    'upsert_category',
    {
      p_kind: input.kind,
      p_name: input.name,
      p_color: input.color,
      p_icon: input.icon,
      p_account_ids: grouped ? [] : input.accountIds,
      ...(input.id ? { p_id: input.id } : {}),
      ...(input.groupId ? { p_group_id: input.groupId } : {}),
      p_color_manual: Boolean(input.colorManual),
      p_sort_order: input.sortOrder ?? 0,
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
    accountIds: grouped ? input.accountIds : input.accountIds,
    ...(input.groupId ? { groupId: input.groupId } : {}),
    colorManual: Boolean(data.color_manual ?? input.colorManual),
    sortOrder: data.sort_order ?? input.sortOrder ?? 0,
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_category', { p_id: id })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить категорию'))
  }
}

export type UpsertCategoryGroupInput = {
  id?: string
  kind: CategoryKind
  name: string
  color: string
  icon: string
  accountIds: string[]
  sortOrder?: number
  childColors?: { id: string; color: string }[]
}

export async function upsertCategoryGroup(input: UpsertCategoryGroupInput): Promise<CategoryGroup> {
  const { data, error } = await supabase.rpc('upsert_category_group', {
    p_kind: input.kind,
    p_name: input.name,
    p_color: input.color,
    p_icon: input.icon,
    p_account_ids: input.accountIds,
    ...(input.id ? { p_id: input.id } : {}),
    p_sort_order: input.sortOrder ?? 0,
    ...(input.childColors?.length ? { p_child_colors: input.childColors } : {}),
  })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить группу'))
  }

  return {
    id: data.id,
    kind: data.kind as CategoryKind,
    name: data.name,
    color: data.color,
    icon: data.icon,
    accountIds: input.accountIds,
    sortOrder: data.sort_order ?? input.sortOrder ?? 0,
  }
}

export async function deleteCategoryGroup(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_category_group', { p_id: id })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить группу'))
  }
}
