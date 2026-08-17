import { getErrorMessage, supabase, type Json } from '@/shared'
import { asPreferenceRecord, parsePreferences, serializePreferences } from '../lib/codec'
import type { Preferences } from '../model/types'

export async function fetchOwnPreferences(userId: string): Promise<{
  prefs: Preferences
  raw: Record<string, Json | undefined>
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('user_id', userId)
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось загрузить настройки'))
  }

  const raw = asPreferenceRecord(data?.preferences)
  return { prefs: parsePreferences(raw), raw }
}

export async function updateOwnPreferences(
  userId: string,
  prefs: Preferences,
  extra: Record<string, Json | undefined> = {},
): Promise<Record<string, Json | undefined>> {
  const payload = serializePreferences(prefs, extra)
  const { data, error } = await supabase
    .from('profiles')
    .update({ preferences: payload })
    .eq('user_id', userId)
    .select('preferences')
    .single()

  if (error) {
    throw new Error(getErrorMessage(error, 'Не удалось сохранить настройки'))
  }

  return asPreferenceRecord(data?.preferences)
}
