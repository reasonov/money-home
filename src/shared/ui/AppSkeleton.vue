<script setup lang="ts">
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
    <div v-for="index in rows" :key="index" class="skeleton__row" :style="{ width: `${88 - index * 12}%` }" />
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton__row {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--color-border) 0%,
    var(--color-skeleton-shine) 45%,
    var(--color-border) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
</style>
