<script setup lang="ts">
import { NAlert } from 'naive-ui'

withDefaults(
  defineProps<{
    variant?: 'success' | 'warning' | 'info'
  }>(),
  {
    variant: 'info',
  },
)
</script>

<template>
  <NAlert :type="variant" :bordered="false" :show-icon="true">
    <slot />
  </NAlert>
</template>
