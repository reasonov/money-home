import { getErrorMessage, supabase } from '@/shared'
import type {
  Transaction,
  TransactionKind,
  TransactionSource,
  TransactionStatus,
} from '../model/types'

type TransactionRow = {
  id: string
  account_id: string
  counterparty_account_id: string | null
  kind: string
  status: string
  source: string
  category_id: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  title: string | null
  amount: number
  occurred_on: string
  notes: string | null
  created_by: string
}

export function mapTransaction(row: TransactionRow): Transaction {
  const title = row.title?.trim()
  const notes = row.notes?.trim()
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind as TransactionKind,
    status: row.status as TransactionStatus,
    source: row.source as TransactionSource,
    amount: Math.round(Number(row.amount)),
    occurredOn: row.occurred_on,
    createdBy: row.created_by,
    ...(row.counterparty_account_id ? { counterpartyAccountId: row.counterparty_account_id } : {}),
    ...(row.category_id ? { categoryId: row.category_id } : {}),
    ...(row.category_name ? { categoryName: row.category_name } : {}),
    ...(row.category_color ? { categoryColor: row.category_color } : {}),
    ...(row.category_icon ? { categoryIcon: row.category_icon } : {}),
    ...(title ? { title } : {}),
    ...(notes ? { notes } : {}),
  }
}

const SELECT =
  'id, account_id, counterparty_account_id, kind, status, source, category_id, category_name, category_color, category_icon, title, amount, occurred_on, notes, created_by'

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить операции'))
  }
  return (data ?? []).map(mapTransaction)
}

export async function insertTransaction(input: {
  accountId: string
  kind: 'expense' | 'income'
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  title?: string
  amount: number
  occurredOn: string
  notes?: string
  createdBy: string
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: input.accountId,
      kind: input.kind,
      status: 'posted',
      source: 'manual',
      category_id: input.categoryId ?? null,
      category_name: input.categoryName ?? null,
      category_color: input.categoryColor ?? null,
      category_icon: input.categoryIcon ?? null,
      title: input.title?.trim() || null,
      amount: Math.round(input.amount),
      occurred_on: input.occurredOn,
      notes: input.notes?.trim() || null,
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select(SELECT)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить операцию'))
  }
  return mapTransaction(data)
}

export async function applyDueIncomeRules(asOf: string) {
  const { data, error } = await supabase.rpc('apply_due_income_rules', { p_as_of: asOf })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось начислить пополнения'))
  }
  return (data ?? []).map(mapTransaction)
}

export async function applyDueExpenseRules(asOf: string) {
  const { data, error } = await supabase.rpc('apply_due_expense_rules', { p_as_of: asOf })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось списать регулярные расходы'))
  }
  return (data ?? []).map(mapTransaction)
}

export async function skipIncomeOccurrence(occurrenceId: string): Promise<void> {
  const { error } = await supabase.rpc('skip_income_occurrence', { p_occurrence_id: occurrenceId })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось отменить пополнение'))
  }
}

export async function adjustIncomeOccurrence(occurrenceId: string, amount: number): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc('adjust_income_occurrence', {
      p_occurrence_id: occurrenceId,
      p_new_amount: Math.round(amount),
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось изменить пополнение'))
  }
  return mapTransaction(data)
}

export async function skipExpenseOccurrence(occurrenceId: string): Promise<void> {
  const { error } = await supabase.rpc('skip_expense_occurrence', { p_occurrence_id: occurrenceId })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось отменить расход'))
  }
}

export async function adjustExpenseOccurrence(occurrenceId: string, amount: number): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc('adjust_expense_occurrence', {
      p_occurrence_id: occurrenceId,
      p_new_amount: Math.round(amount),
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось изменить расход'))
  }
  return mapTransaction(data)
}

export type OccurrenceRow = {
  id: string
  income_rule_id: string
  occurred_on: string
  status: string
  transaction_id: string | null
}

export type ExpenseOccurrenceRow = {
  id: string
  expense_rule_id: string
  occurred_on: string
  status: string
  transaction_id: string | null
}

export async function fetchOccurrences(): Promise<OccurrenceRow[]> {
  const { data, error } = await supabase
    .from('income_occurrences')
    .select('id, income_rule_id, occurred_on, status, transaction_id')

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить начисления'))
  }
  return data ?? []
}

export async function fetchExpenseOccurrences(): Promise<ExpenseOccurrenceRow[]> {
  const { data, error } = await supabase
    .from('expense_occurrences')
    .select('id, expense_rule_id, occurred_on, status, transaction_id')

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить списания'))
  }
  return data ?? []
}

export async function updatePostedTransaction(input: {
  id: string
  accountId: string
  amount: number
  occurredOn: string
  counterpartyAccountId?: string
  categoryId?: string
  title?: string
  notes?: string
}): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc('update_posted_transaction', {
      p_id: input.id,
      p_account_id: input.accountId,
      p_amount: Math.round(input.amount),
      p_occurred_on: input.occurredOn,
      p_counterparty_account_id: input.counterpartyAccountId,
      p_category_id: input.categoryId,
      p_title: input.title,
      p_notes: input.notes,
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить операцию'))
  }
  return mapTransaction(data)
}

export async function cancelPostedTransaction(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_posted_transaction', { p_id: id })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось удалить операцию'))
  }
}
