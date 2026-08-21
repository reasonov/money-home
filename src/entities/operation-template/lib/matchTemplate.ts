import { roundMoney } from '@/shared'
import type { OperationTemplate } from '../model/types'

export type TemplateMatchFields = {
  kind: OperationTemplate['kind']
  categoryId: string
  amount: number
  title?: string
  notes?: string
}

export function findMatchingTemplate(
  templates: OperationTemplate[],
  fields: TemplateMatchFields,
): OperationTemplate | undefined {
  const title = fields.title?.trim() ?? ''
  const notes = fields.notes?.trim() ?? ''
  const amount = roundMoney(fields.amount)
  return templates.find(
    (item) =>
      item.kind === fields.kind &&
      item.categoryId === fields.categoryId &&
      item.amount === amount &&
      (item.title ?? '') === title &&
      (item.notes ?? '') === notes,
  )
}
