import { registerSW } from 'virtual:pwa-register'
import { NETWORK_ERROR_MESSAGE } from '@/shared'
import { setBootError } from './boot'

const RELOAD_KEY = 'money-home.stale-asset-reload'
const RELOAD_COOLDOWN_MS = 10_000

export function registerPwa() {
  registerSW({ immediate: true })

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
