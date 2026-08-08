export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'money-home.theme'

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && PREFERENCES.includes(value as ThemePreference)
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(raw)) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, preference)
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return getSystemTheme()
  }
  return preference
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#14181C' : '#0F766E')
  }

  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (statusBar) {
    statusBar.setAttribute('content', resolved === 'dark' ? 'black-translucent' : 'default')
  }
}
