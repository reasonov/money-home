export type ActivityKind =
  | 'purchase_created'
  | 'purchase_updated'
  | 'purchase_done'
  | 'purchase_cancelled'
  | 'account_updated'
  | 'income_rule_changed'
  | 'expense_rule_changed'
  | 'transfer_rule_changed'
  | 'transaction_created'
  | 'income_auto_posted'
  | 'expense_auto_posted'
  | 'transfer_auto_posted'
  | 'savings_goal_changed'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  actorId: string
  actorName: string
  purchaseId?: string
  transactionId?: string
  occurrenceId?: string
  savingsGoalId?: string
  summary: string
  createdAt: string
  seenAt: string | null
}
