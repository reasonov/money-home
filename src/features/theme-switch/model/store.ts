import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from '@/shared'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(loadThemePreference())
  let mediaQuery: MediaQueryList | null = null

  const resolved = computed(() => resolveTheme(preference.value))

  function setPreference(next: ThemePreference) {
    preference.value = next
    saveThemePreference(next)
    applyTheme(next)
  }

  function onSystemChange() {
    if (preference.value === 'system') {
      applyTheme('system')
    }
  }

  function init() {
    applyTheme(preference.value)

    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    mediaQuery?.removeEventListener('change', onSystemChange)
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemChange)
  }

  return {
    preference,
    resolved,
    setPreference,
    init,
  }
})
