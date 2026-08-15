import { getErrorMessage, supabase } from '@/shared'

export async function updateProfileName(userId: string, displayName: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('user_id', userId)

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось обновить имя'))
  }
}
