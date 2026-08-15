<script setup lang="ts">
import { NTag } from 'naive-ui'

withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
    size?: 'small' | 'medium' | 'large'
  }>(),
  {
    type: 'default',
    size: 'small',
  },
)
</script>

<template>
  <NTag :type="type" :size="size" :bordered="false">
    <slot />
  </NTag>
</template>
