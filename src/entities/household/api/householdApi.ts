import { getErrorMessage, supabase } from '@/shared'
import type { Household } from '../model/types'
import type { HouseholdMember } from '../model/member'

function mapHousehold(row: {
  id: string
  name: string
  invite_code: string
}): Household {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
  }
}

export async function fetchCurrentMembership(): Promise<{
  household: Household
  members: HouseholdMember[]
} | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error(getErrorMessage(userError))
  }
  const userId = userData.user?.id
  if (!userId) {
    return null
  }

  const { data: membership, error: memberError } = await supabase
    .from('members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) {
    throw new Error(getErrorMessage(memberError))
  }
  if (!membership) {
    return null
  }

  const [{ data: household, error: householdError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase.from('households').select('*').eq('id', membership.household_id).single(),
      supabase.from('members').select('*').eq('household_id', membership.household_id),
    ])

  if (householdError) {
    throw new Error(getErrorMessage(householdError))
  }
  if (membersError) {
    throw new Error(getErrorMessage(membersError))
  }

  return {
    household: mapHousehold(household),
    members: (members ?? []).map((row) => ({
      userId: row.user_id,
      householdId: row.household_id,
      displayName: row.display_name,
    })),
  }
}

export async function createHousehold(name: string): Promise<Household> {
  const { data, error } = await supabase
    .rpc('create_household', { p_name: name.trim() || 'Наша семья' })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось создать семью'))
  }
  return mapHousehold(data)
}

export async function joinHousehold(inviteCode: string): Promise<Household> {
  const { data, error } = await supabase
    .rpc('join_household', { p_invite_code: inviteCode.trim() })
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось войти в семью'))
  }
  return mapHousehold(data)
}
