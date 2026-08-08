<script setup lang="ts">
defineProps<{
  id?: string
  type?: string
  placeholder?: string
  min?: number | string
  max?: number | string
  step?: number | string
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  autocomplete?: string
  required?: boolean
  disabled?: boolean
}>()

const model = defineModel<string | number>({ required: true })
</script>

<template>
  <input
    class="app-input"
    :id="id"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    :inputmode="inputmode"
    :autocomplete="autocomplete"
    :required="required"
    :disabled="disabled"
    :value="model"
    @input="model = ($event.target as HTMLInputElement).value"
  />
</template>

<style scoped>
.app-input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  outline: none;
  transition: border-color 0.15s ease;
}

.app-input:focus {
  border-color: var(--color-accent);
}

.app-input:disabled {
  opacity: 0.6;
  background: var(--color-bg);
}
</style>
