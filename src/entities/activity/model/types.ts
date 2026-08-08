export type ActivityKind =
  | 'purchase_created'
  | 'purchase_updated'
  | 'purchase_done'
  | 'purchase_cancelled'
  | 'balance_updated'
  | 'income_rule_changed'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  actorId: string
  actorName: string
  purchaseId?: string
  summary: string
  createdAt: string
  seenAt: string | null
}
