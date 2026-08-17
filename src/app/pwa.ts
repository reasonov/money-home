import { registerSW } from 'virtual:pwa-register'
import { NETWORK_ERROR_MESSAGE } from '@/shared'
import { setBootError } from './boot'

const RELOAD_KEY = 'money-home.stale-asset-reload'
const RELOAD_COOLDOWN_MS = 10_000

const DEV_SW_CLEAR_KEY = 'money-home.dev-sw-cleared'

async function unregisterDevServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }
  const registrations = await navigator.serviceWorker.getRegistrations()
  if (!registrations.length) {
    return
  }
  if (sessionStorage.getItem(DEV_SW_CLEAR_KEY)) {
    return
  }
  sessionStorage.setItem(DEV_SW_CLEAR_KEY, '1')
  await Promise.allSettled(registrations.map((registration) => registration.unregister()))
  window.location.reload()
}

export function registerPwa() {
  if (import.meta.env.DEV) {
    void unregisterDevServiceWorkers()
  } else {
    registerSW({ immediate: true })
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0')
    if (Date.now() - lastReload >= RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
      return
    }

    setBootError(
      navigator.onLine === false
        ? NETWORK_ERROR_MESSAGE
        : 'Не удалось загрузить приложение. Проверьте интернет и попробуйте снова',
    )
  })
}
