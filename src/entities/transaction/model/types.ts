export type TransactionKind = 'expense' | 'income' | 'transfer'
export type TransactionStatus = 'posted' | 'cancelled'
export type TransactionSource = 'manual' | 'income_rule' | 'purchase'

export interface Transaction {
  id: string
  accountId: string
  counterpartyAccountId?: string
  kind: TransactionKind
  status: TransactionStatus
  source: TransactionSource
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  title?: string
  amount: number
  occurredOn: string
  notes?: string
  createdBy: string
}
