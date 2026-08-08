<script setup lang="ts">
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
  <div class="app-banner" :class="`is-${variant}`" role="status">
    <slot />
  </div>
</template>

<style scoped>
.app-banner {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
  line-height: 1.45;
}

.is-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.is-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.is-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
</style>
