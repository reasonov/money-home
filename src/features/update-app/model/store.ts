import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { APP_VERSION } from '@/shared'
import { applyAppUpdate } from '../lib/applyUpdate'
import { fetchLatestVersion } from '../lib/latestVersion'

export const useAppUpdateStore = defineStore('update-app', () => {
  const latestVersion = ref<string | null>(null)
  const applying = ref(false)

  const outdated = computed(
    () => latestVersion.value !== null && latestVersion.value !== APP_VERSION,
  )

  async function check() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return
    }
    const latest = await fetchLatestVersion()
    if (latest) {
      latestVersion.value = latest
    }
  }

  async function apply() {
    if (applying.value) {
      return
    }
    applying.value = true
    try {
      await applyAppUpdate()
    } catch {
      applying.value = false
    }
  }

  return {
    latestVersion,
    applying,
    outdated,
    check,
    apply,
  }
})
