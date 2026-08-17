<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, dateRuRU, ruRU } from 'naive-ui'
import { AppButton, AppConfirmDialog, AppToastHost, naiveThemeOverrides } from '@/shared'
import { useSessionStore } from '@/entities/session'
import { useThemeStore } from '@/features/theme-switch'
import { bootError, retryBoot } from './boot'

const theme = useThemeStore()
const session = useSessionStore()
const router = useRouter()

watch(
  () => session.passwordRecovery,
  (recovery) => {
    if (recovery && router.currentRoute.value.name !== 'reset-password') {
      void router.push({ name: 'reset-password' })
    }
  },
)

const naiveTheme = computed(() => (theme.resolved === 'dark' ? darkTheme : null))
const overrides = computed(() => naiveThemeOverrides(theme.resolved))
</script>

<template>
  <NConfigProvider
    :theme="naiveTheme"
    :theme-overrides="overrides"
    :locale="ruRU"
    :date-locale="dateRuRU"
  >
    <div v-if="bootError" class="boot-fail" role="alert">
      <p class="boot-fail__brand">Money Home</p>
      <h1 class="boot-fail__title">Не удалось открыть приложение</h1>
      <p class="boot-fail__text">{{ bootError }}</p>
      <AppButton @click="retryBoot">Повторить</AppButton>
    </div>
    <NMessageProvider v-else placement="bottom">
      <NDialogProvider>
        <RouterView />
        <AppToastHost />
        <AppConfirmDialog />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.boot-fail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100dvh;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: calc(var(--space-5) + env(safe-area-inset-top, 0px)) var(--space-4)
    calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
}

.boot-fail__brand {
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.boot-fail__title {
  margin-top: var(--space-3);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.boot-fail__text {
  margin: var(--space-3) 0 var(--space-5);
  color: var(--color-text-muted);
}
</style>
