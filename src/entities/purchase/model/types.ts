export type PurchaseStatus = 'planned' | 'done' | 'cancelled'

export interface Purchase {
  id: string
  title: string
  amount: number
  plannedDate: string
  notes?: string
  status: PurchaseStatus
  createdBy: string
}
