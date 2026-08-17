import type { Preferences } from '../model/types'

export const PREFERENCES_STORAGE_KEY = 'money-home.preferences'

export const DEFAULT_PREFERENCES: Preferences = {
  amountSuggestions: true,
}

function storageKey(userId: string) {
  return `${PREFERENCES_STORAGE_KEY}.${userId}`
}

function parseStored(raw: string | null): Preferences | null {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
      amountSuggestions:
        typeof parsed.amountSuggestions === 'boolean'
          ? parsed.amountSuggestions
          : DEFAULT_PREFERENCES.amountSuggestions,
    }
  } catch {
    return null
  }
}

export function loadPreferences(userId: string): Preferences {
  try {
    const scoped = parseStored(localStorage.getItem(storageKey(userId)))
    if (scoped) {
      return scoped
    }
    const legacy = parseStored(localStorage.getItem(PREFERENCES_STORAGE_KEY))
    if (legacy) {
      savePreferences(userId, legacy)
      return legacy
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFERENCES }
}

export function savePreferences(userId: string, prefs: Preferences) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}
