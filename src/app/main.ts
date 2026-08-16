import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { setBootError } from './boot'
import { registerPwa } from './pwa'
import router from './router'
import { bootstrapAccountSession, resetAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'
import { listenForInstallPrompt } from '@/features/install-pwa'
import { resetProductTour } from '@/features/product-tour'
import { useThemeStore } from '@/features/theme-switch'
import { getErrorMessage, NETWORK_ERROR_MESSAGE } from '@/shared'

import '@/shared/styles/tokens.css'
import '@/shared/styles/base.css'

const BOOT_TIMEOUT_MS = 20_000

listenForInstallPrompt()
registerPwa()

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(NETWORK_ERROR_MESSAGE)), BOOT_TIMEOUT_MS)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  useThemeStore(pinia).init()

  const session = useSessionStore(pinia)
  try {
    await withTimeout(session.init())
    if (session.isAuthenticated) {
      await withTimeout(bootstrapAccountSession())
    }
  } catch (error) {
    setBootError(getErrorMessage(error, NETWORK_ERROR_MESSAGE))
  }

  watch(
    () => session.isAuthenticated,
    (isAuth, wasAuth) => {
      if (wasAuth && !isAuth) {
        resetAccountSession()
        resetProductTour()
      }
      if (!wasAuth && isAuth) {
        void bootstrapAccountSession()
      }
    },
  )

  app.use(router)
  await router.isReady()
  app.mount('#app')
  document.getElementById('boot-fallback')?.setAttribute('hidden', '')
}

void bootstrap()
