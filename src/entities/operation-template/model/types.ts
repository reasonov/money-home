export interface OperationTemplate {
  id: string
  kind: 'expense' | 'income'
  categoryId: string
  amount: number
  title?: string
  notes?: string
}

export type OperationTemplateInput = Omit<OperationTemplate, 'id'> & { id?: string }
