import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { SyncStatus } from './types'

export const useSyncStore = defineStore('sync', () => {
  const status = ref<SyncStatus>('idle')
  const lastError = ref<string | null>(null)
  const pendingCount = ref(0)
  const pendingIds = ref<string[]>([])
  const online = ref(true)
  const bannerDismissed = ref(false)

  const bannerText = computed(() => {
    if (status.value === 'readonly') {
      return 'Сессия истекла — только просмотр. Войдите при появлении сети'
    }
    if (status.value === 'error') {
      return lastError.value || 'Не удалось синхронизировать'
    }
    if (status.value === 'offline') {
      return pendingCount.value
        ? 'Нет сети — изменения сохранятся при подключении'
        : 'Нет сети — показаны сохранённые данные'
    }
    return ''
  })

  const showBanner = computed(() => Boolean(bannerText.value) && !bannerDismissed.value)
  const showStatusIcon = computed(() => Boolean(bannerText.value) && bannerDismissed.value)

  function dismissBanner() {
    if (bannerText.value) {
      bannerDismissed.value = true
    }
  }

  function isPending(id: string) {
    return pendingIds.value.includes(id)
  }

  watch(status, (next) => {
    if (next === 'idle') {
      bannerDismissed.value = false
    }
  })

  return {
    status,
    lastError,
    pendingCount,
    pendingIds,
    online,
    bannerText,
    showBanner,
    showStatusIcon,
    dismissBanner,
    isPending,
  }
})
