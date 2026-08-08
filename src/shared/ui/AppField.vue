<script setup lang="ts">
defineProps<{
  label: string
  forId?: string
  hint?: string
}>()
</script>

<template>
  <label class="app-field" :for="forId">
    <span class="app-field__label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="app-field__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.app-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.app-field__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.app-field__hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
</style>
