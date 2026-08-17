import { getErrorMessage, supabase } from '@/shared'
import type { Account, AccountMember } from '../model/types'

type AccountRow = {
  id: string
  name: string
  amount: number
  owner_id: string
  invite_code: string | null
  exclude_from_total?: boolean | null
}

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    amount: Math.round(Number(row.amount)),
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    excludeFromTotal: Boolean(row.exclude_from_total),
  }
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, amount, owner_id, invite_code, exclude_from_total')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить счета'))
  }
  return (data ?? []).map(mapAccount)
}

export async function fetchAccountMembers(): Promise<AccountMember[]> {
  const { data, error } = await supabase.from('account_members').select('account_id, user_id')

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить участников'))
  }

  const rows = data ?? []
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const names = new Map<string, string>()

  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)

    if (profileError) {
      throw new Error(getErrorMessage(profileError, 'Не удалось загрузить участников'))
    }

    for (const profile of profiles ?? []) {
      names.set(profile.user_id, profile.display_name.trim() || 'Участник')
    }
  }

  return rows.map((row) => ({
    accountId: row.account_id,
    userId: row.user_id,
    displayName: names.get(row.user_id) || 'Участник',
  }))
}

export async function createAccount(input: {
  id?: string
  name: string
  openingAmount: number
  categoryIds?: string[]
}): Promise<Account> {
  const { data, error } = await supabase
    .rpc('create_account', {
      p_name: input.name,
      p_opening_amount: Math.round(input.openingAmount),
      p_category_ids: input.categoryIds?.length ? input.categoryIds : undefined,
      ...(input.id ? { p_id: input.id } : {}),
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось создать счёт'))
  }
  return mapAccount(data)
}

export async function joinAccount(inviteCode: string): Promise<Account> {
  const { data, error } = await supabase.rpc('join_account', { p_invite_code: inviteCode }).single()
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось добавить счёт'))
  }
  return mapAccount(data)
}

export async function shareAccount(accountId: string): Promise<Account> {
  const { data, error } = await supabase.rpc('share_account', { p_account_id: accountId }).single()
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось создать код счёта'))
  }
  return mapAccount(data)
}

export async function leaveAccount(accountId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_account', { p_account_id: accountId })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось покинуть счёт'))
  }
}

export async function updateAccount(
  id: string,
  userId: string,
  patch: { name?: string; amount?: number; excludeFromTotal?: boolean },
): Promise<Account> {
  const payload: {
    name?: string
    amount?: number
    exclude_from_total?: boolean
    updated_by: string
  } = { updated_by: userId }
  if (patch.name != null) payload.name = patch.name.trim()
  if (patch.amount != null) payload.amount = Math.round(patch.amount)
  if (patch.excludeFromTotal != null) payload.exclude_from_total = patch.excludeFromTotal

  const { data, error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', id)
    .select('id, name, amount, owner_id, invite_code, exclude_from_total')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить счёт'))
  }
  return mapAccount(data)
}

export async function adjustAccountAmount(id: string, delta: number): Promise<Account> {
  const { data, error } = await supabase
    .rpc('adjust_account_amount', {
      p_account_id: id,
      p_delta: Math.round(delta),
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить счёт'))
  }
  return mapAccount(data)
}

export async function setAccountCategories(accountId: string, categoryIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_account_categories', {
    p_account_id: accountId,
    p_category_ids: categoryIds,
  })
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить категории счёта'))
  }
}

export async function transferBetweenAccounts(input: {
  id?: string
  fromAccountId: string
  toAccountId: string
  amount: number
  occurredOn: string
  notes?: string
}) {
  const { data, error } = await supabase
    .rpc('transfer_between_accounts', {
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount: Math.round(input.amount),
      p_occurred_on: input.occurredOn,
      p_notes: input.notes,
      ...(input.id ? { p_id: input.id } : {}),
    })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось перевести средства'))
  }
  return data
}

export async function ensureProfile() {
  const { error } = await supabase.rpc('ensure_profile')
  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить профиль'))
  }
}
