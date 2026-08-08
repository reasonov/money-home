<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    rows?: number
    required?: boolean
    disabled?: boolean
  }>(),
  {
    rows: 4,
    required: false,
    disabled: false,
  },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea
    class="app-textarea"
    :id="id"
    :placeholder="placeholder"
    :rows="rows"
    :required="required"
    :disabled="disabled"
    :value="model"
    @input="model = ($event.target as HTMLTextAreaElement).value"
  />
</template>

<style scoped>
.app-textarea {
  width: 100%;
  min-height: 96px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  resize: vertical;
  outline: none;
  font: inherit;
  line-height: 1.45;
  transition: border-color 0.15s ease;
}

.app-textarea:focus {
  border-color: var(--color-accent);
}

.app-textarea:disabled {
  opacity: 0.6;
  background: var(--color-bg);
}
</style>
