<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    block?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    block: false,
    disabled: false,
  },
)
</script>

<template>
  <button
    class="app-button"
    :class="[`is-${variant}`, { 'is-block': block }]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.is-block {
  width: 100%;
}

.is-primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.is-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.is-secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.is-secondary:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.is-ghost {
  background: transparent;
  color: var(--color-accent);
}

.is-danger {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: transparent;
}
</style>
