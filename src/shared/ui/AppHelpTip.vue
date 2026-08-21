<script setup lang="ts">
import { CircleHelp } from '@lucide/vue'
import { NPopover } from 'naive-ui'

defineProps<{
  text: string
}>()
</script>

<template>
  <NPopover trigger="click" placement="bottom-start" :z-index="2000000005">
    <template #trigger>
      <button type="button" class="help" aria-label="Подсказка">
        <CircleHelp :size="16" :stroke-width="2" />
      </button>
    </template>
    <p class="help__text">{{ text }}</p>
  </NPopover>
</template>

<style scoped>
.help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: -14px -10px -14px -6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.help__text {
  margin: 0;
  max-width: 16rem;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
