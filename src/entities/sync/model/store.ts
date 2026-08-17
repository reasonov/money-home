import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SyncStatus } from './types'

export const useSyncStore = defineStore('sync', () => {
  const status = ref<SyncStatus>('idle')
  const lastError = ref<string | null>(null)
  const pendingCount = ref(0)
  const pendingIds = ref<string[]>([])
  const online = ref(true)

  const bannerText = computed(() => {
    if (status.value === 'readonly') {
      return 'Сессия истекла — только просмотр. Войдите при появлении сети'
    }
    if (status.value === 'syncing') {
      return 'Синхронизация…'
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

  function isPending(id: string) {
    return pendingIds.value.includes(id)
  }

  return {
    status,
    lastError,
    pendingCount,
    pendingIds,
    online,
    bannerText,
    isPending,
  }
})
