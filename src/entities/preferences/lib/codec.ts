import type { Json } from '@/shared'
import type { Preferences } from '../model/types'
import { DEFAULT_PREFERENCES } from './persist'

export function parsePreferences(raw: unknown): Preferences {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    amountSuggestions:
      typeof obj.amount_suggestions === 'boolean'
        ? obj.amount_suggestions
        : DEFAULT_PREFERENCES.amountSuggestions,
  }
}

export function asPreferenceRecord(raw: unknown): Record<string, Json | undefined> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return { ...(raw as Record<string, Json | undefined>) }
}

export function serializePreferences(
  prefs: Preferences,
  extra: Record<string, Json | undefined> = {},
): Json {
  return {
    ...extra,
    amount_suggestions: prefs.amountSuggestions,
  }
}
