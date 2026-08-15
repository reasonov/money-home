<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, dateRuRU, ruRU } from 'naive-ui'
import { AppConfirmDialog, AppToastHost, naiveThemeOverrides } from '@/shared'
import { useThemeStore } from '@/features/theme-switch'

const theme = useThemeStore()

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
    <NMessageProvider placement="bottom">
      <NDialogProvider>
        <RouterView />
        <AppToastHost />
        <AppConfirmDialog />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
