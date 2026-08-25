import {
  DEFAULT_BOTTOM_NAV,
  DEFAULT_SIDEBAR_SECTIONS,
  MAX_SIDEBAR_ACCOUNTS,
  normalizeBottomNav,
  normalizeSidebarSections,
  parseAccountOrder,
  parseSidebarAccountIds,
  type NavItemId,
} from '@/shared'
import type { Preferences } from '../model/types'

export const PREFERENCES_STORAGE_KEY = 'money-home.preferences'

export const DEFAULT_PREFERENCES: Preferences = {
  amountSuggestions: true,
  starterCatalogApplied: false,
  starterCatalogDismissed: false,
  bottomNav: [...DEFAULT_BOTTOM_NAV] as [NavItemId, NavItemId, NavItemId, NavItemId],
  sidebarSections: [...DEFAULT_SIDEBAR_SECTIONS],
  sidebarAccountIds: null,
  accountOrder: [],
}

function storageKey(userId: string) {
  return `${PREFERENCES_STORAGE_KEY}.${userId}`
}

export function clonePreferences(prefs: Preferences): Preferences {
  return {
    ...prefs,
    bottomNav: normalizeBottomNav(prefs.bottomNav),
    sidebarSections: normalizeSidebarSections(prefs.sidebarSections),
    sidebarAccountIds: prefs.sidebarAccountIds ? [...prefs.sidebarAccountIds] : null,
    accountOrder: [...prefs.accountOrder],
  }
}

function parseStored(raw: string | null): Preferences | null {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences> & Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    const sidebarAccountIds =
      parsed.sidebarAccountIds === undefined
        ? parseSidebarAccountIds(parsed)
        : parsed.sidebarAccountIds === null
          ? null
          : parseAccountOrder(parsed.sidebarAccountIds).slice(0, MAX_SIDEBAR_ACCOUNTS)
    return {
      amountSuggestions:
        typeof parsed.amountSuggestions === 'boolean'
          ? parsed.amountSuggestions
          : DEFAULT_PREFERENCES.amountSuggestions,
      starterCatalogApplied:
        typeof parsed.starterCatalogApplied === 'boolean'
          ? parsed.starterCatalogApplied
          : DEFAULT_PREFERENCES.starterCatalogApplied,
      starterCatalogDismissed:
        typeof parsed.starterCatalogDismissed === 'boolean'
          ? parsed.starterCatalogDismissed
          : DEFAULT_PREFERENCES.starterCatalogDismissed,
      bottomNav: normalizeBottomNav(parsed.bottomNav),
      sidebarSections: normalizeSidebarSections(parsed.sidebarSections),
      sidebarAccountIds,
      accountOrder: parseAccountOrder(parsed.accountOrder),
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
  return clonePreferences(DEFAULT_PREFERENCES)
}

export function savePreferences(userId: string, prefs: Preferences) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}
