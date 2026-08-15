import { registerSW } from 'virtual:pwa-register'

const RELOAD_KEY = 'money-home.stale-asset-reload'
const RELOAD_COOLDOWN_MS = 10_000

export function registerPwa() {
  registerSW({ immediate: true })

  window.addEventListener('vite:preloadError', (event) => {
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0')
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
      return
    }

    event.preventDefault()
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  })
}
