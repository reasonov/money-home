<script setup lang="ts">
import { NEmpty } from 'naive-ui'

withDefaults(
  defineProps<{
    description?: string
  }>(),
  {
    description: 'Пока пусто',
  },
)
</script>

<template>
  <NEmpty :description="description">
    <template v-if="$slots.default" #extra>
      <slot />
    </template>
  </NEmpty>
</template>
