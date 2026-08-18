import { getErrorMessage, supabase } from '@/shared'
import type { OperationTemplate, OperationTemplateInput } from '../model/types'

type TemplateRow = {
  id: string
  kind: string
  category_id: string
  amount: number
  title: string | null
  notes: string | null
}

export function mapOperationTemplate(row: TemplateRow): OperationTemplate {
  const title = row.title?.trim()
  const notes = row.notes?.trim()
  return {
    id: row.id,
    kind: row.kind as OperationTemplate['kind'],
    categoryId: row.category_id,
    amount: Math.round(Number(row.amount)),
    ...(title ? { title } : {}),
    ...(notes ? { notes } : {}),
  }
}

const SELECT = 'id, kind, category_id, amount, title, notes'

function toRow(userId: string, input: OperationTemplateInput) {
  return {
    ...(input.id ? { id: input.id } : {}),
    user_id: userId,
    kind: input.kind,
    category_id: input.categoryId,
    amount: Math.round(input.amount),
    title: input.title?.trim() || null,
    notes: input.notes?.trim() || null,
  }
}

export async function fetchOperationTemplates(): Promise<OperationTemplate[]> {
  const { data, error } = await supabase
    .from('operation_templates')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить избранное'))
  }
  return (data ?? []).map(mapOperationTemplate)
}

export async function upsertOperationTemplate(
  userId: string,
  input: OperationTemplateInput,
): Promise<OperationTemplate> {
  const { data, error } = await supabase
    .from('operation_templates')
    .upsert(toRow(userId, input), { onConflict: 'id' })
    .select(SELECT)
    .single()

  if (error?.code === '23505' && input.id) {
    const existing = await supabase
      .from('operation_templates')
      .select(SELECT)
      .eq('id', input.id)
      .single()
    if (existing.data) {
      return mapOperationTemplate(existing.data)
    }
  }
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить избранное'))
  }
  return mapOperationTemplate(data)
}

export async function deleteOperationTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('operation_templates').delete().eq('id', id)
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить избранное'))
  }
}
