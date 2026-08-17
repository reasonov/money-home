import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Json } from '@/shared'
import { fetchOwnPreferences, updateOwnPreferences } from '../api/preferencesApi'
import { parsePreferences } from '../lib/codec'
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '../lib/persist'
import type { Preferences } from './types'

export const usePreferencesStore = defineStore('preferences', () => {
  const amountSuggestions = ref(DEFAULT_PREFERENCES.amountSuggestions)
  const userId = ref<string | null>(null)
  let extra: Record<string, Json | undefined> = {}
  let dirty = false
  let writes: Promise<void> = Promise.resolve()

  function snapshot(): Preferences {
    return { amountSuggestions: amountSuggestions.value }
  }

  function apply(prefs: Preferences, persist: boolean) {
    amountSuggestions.value = prefs.amountSuggestions
    if (persist && userId.value) {
      savePreferences(userId.value, prefs)
    }
  }

  function hydrateLocal(nextUserId: string) {
    userId.value = nextUserId
    apply(loadPreferences(nextUserId), false)
  }

  function applyRemote(raw: unknown) {
    if (dirty) {
      return
    }
    extra =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...(raw as Record<string, Json | undefined>) }
        : {}
    apply(parsePreferences(raw), true)
  }

  async function pushCurrent() {
    const id = userId.value
    if (!id) {
      return
    }
    extra = await updateOwnPreferences(id, snapshot(), extra)
    dirty = false
  }

  function persistRemote() {
    const id = userId.value
    if (!id) {
      return writes
    }
    dirty = true
    savePreferences(id, snapshot())
    writes = writes.then(pushCurrent).catch(() => {
      /* keep dirty; flush on sync */
    })
    return writes
  }

  function setAmountSuggestions(next: boolean) {
    amountSuggestions.value = next
    void persistRemote()
  }

  async function flush() {
    await writes
    if (!dirty || !userId.value) {
      return
    }
    await pushCurrent()
  }

  async function loadFromServer() {
    const id = userId.value
    if (!id) {
      return
    }
    await flush()
    if (dirty) {
      return
    }
    const remote = await fetchOwnPreferences(id)
    extra = remote.raw
    if (typeof extra.amount_suggestions !== 'boolean') {
      dirty = true
      await pushCurrent()
      return
    }
    apply(remote.prefs, true)
  }

  async function syncWithServer() {
    try {
      await loadFromServer()
    } catch {
      /* keep local cache */
    }
  }

  function reset() {
    userId.value = null
    extra = {}
    dirty = false
    writes = Promise.resolve()
    apply({ ...DEFAULT_PREFERENCES }, false)
  }

  return {
    amountSuggestions,
    hydrateLocal,
    applyRemote,
    setAmountSuggestions,
    syncWithServer,
    reset,
  }
})
