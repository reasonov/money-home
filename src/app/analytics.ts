import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  closeFormDrawer,
  flushAnalytics,
  formDrawer,
  lastFormDrawerCloseReason,
  track,
  trackSessionStart,
} from '@/shared'

export function useProductAnalytics() {
  const route = useRoute()

  watch(
    () => String(route.name ?? ''),
    (screen, previous) => {
      if (!screen || screen === previous) {
        return
      }
      track('screen_view', { screen })
    },
    { immediate: true },
  )

  watch(formDrawer, (next, prev) => {
    if (prev && next && prev.name !== next.name) {
      track('form_dismissed', { form: prev.name, source: 'replaced' })
      track('form_opened', { form: next.name })
      return
    }
    if (prev && !next) {
      const reason = lastFormDrawerCloseReason.value
      if (reason === 'silent') {
        return
      }
      track(reason === 'submit' ? 'form_submitted' : 'form_dismissed', { form: prev.name })
      return
    }
    if (next && !prev) {
      track('form_opened', { form: next.name })
    }
  })

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      void flushAnalytics()
    }
  }

  let interval: number | null = null

  onMounted(() => {
    trackSessionStart()
    void flushAnalytics()
    document.addEventListener('visibilitychange', onVisibility)
    interval = window.setInterval(() => {
      void flushAnalytics()
    }, 30_000)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    if (interval != null) {
      window.clearInterval(interval)
    }
    closeFormDrawer('silent')
  })
}
