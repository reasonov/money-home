import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { bootstrapHouseholdSession, resetHouseholdSession } from '@/entities/household'
import { useSessionStore } from '@/entities/session'
import { useThemeStore } from '@/features/theme-switch'

import '@/shared/styles/tokens.css'
import '@/shared/styles/base.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  useThemeStore(pinia).init()

  const session = useSessionStore(pinia)
  await session.init()
  if (session.isAuthenticated) {
    await bootstrapHouseholdSession()
  }

  watch(
    () => session.isAuthenticated,
    (isAuth, wasAuth) => {
      if (wasAuth && !isAuth) {
        resetHouseholdSession()
      }
    },
  )

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
