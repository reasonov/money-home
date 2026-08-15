export type PurchaseStatus = 'planned' | 'done' | 'cancelled'

export interface Purchase {
  id: string
  accountId: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  title: string
  amount: number
  plannedDate: string
  notes?: string
  status: PurchaseStatus
  createdBy: string
}
