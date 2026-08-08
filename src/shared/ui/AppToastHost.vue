<script setup lang="ts">
import { useToastState } from '../lib/toast'

const { message, visible } = useToastState()
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="toast" role="status" aria-live="polite">
      {{ message }}
    </div>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-4));
  z-index: 80;
  max-width: min(calc(100% - 32px), 360px);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: var(--color-bg);
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 8px 24px var(--color-shadow);
  transform: translateX(-50%);
  animation: toast-in 0.2s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
