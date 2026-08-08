import { getErrorMessage, supabase } from '@/shared'

export async function fetchBalance(householdId: string): Promise<number> {
  const { data, error } = await supabase
    .from('balances')
    .select('amount')
    .eq('household_id', householdId)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить баланс'))
  }
  return Math.round(Number(data.amount))
}

export async function updateBalance(householdId: string, amount: number, userId: string) {
  const { data, error } = await supabase
    .from('balances')
    .update({
      amount: Math.round(amount),
      updated_by: userId,
    })
    .eq('household_id', householdId)
    .select('amount')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить баланс'))
  }
  return Math.round(Number(data.amount))
}
