<script setup lang="ts">
import { NSkeleton } from 'naive-ui'

withDefaults(
  defineProps<{
    rows?: number
  }>(),
  {
    rows: 3,
  },
)
</script>

<template>
  <div class="skeleton" aria-busy="true" aria-live="polite">
    <NSkeleton v-for="index in rows" :key="index" :sharp="false" height="16px" :width="`${88 - index * 12}%`" />
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
