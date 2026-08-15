import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { bootstrapAccountSession, resetAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'
import { listenForInstallPrompt } from '@/features/install-pwa'
import { resetProductTour } from '@/features/product-tour'
import { useThemeStore } from '@/features/theme-switch'

import '@/shared/styles/tokens.css'
import '@/shared/styles/base.css'

listenForInstallPrompt()

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  useThemeStore(pinia).init()

  const session = useSessionStore(pinia)
  await session.init()
  if (session.isAuthenticated) {
    await bootstrapAccountSession()
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
}

void bootstrap()
