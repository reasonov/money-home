<script setup lang="ts">
import { NFormItem } from 'naive-ui'
import AppHelpTip from './AppHelpTip.vue'

withDefaults(
  defineProps<{
    label: string
    forId?: string
    hint?: string
    help?: string
    required?: boolean
  }>(),
  { required: false },
)
</script>

<template>
  <NFormItem
    class="app-field"
    label-placement="top"
    :show-feedback="false"
    :show-require-mark="false"
  >
    <template #label>
      <span class="app-field__label">
        {{ label }}
        <span v-if="required" class="app-field__req" aria-hidden="true">*</span>
        <AppHelpTip v-if="help" :text="help" />
      </span>
    </template>
    <div class="app-field__body">
      <slot />
      <p v-if="hint" class="app-field__hint">{{ hint }}</p>
    </div>
  </NFormItem>
</template>

<style scoped>
.app-field {
  --n-feedback-height: 0;
  margin-bottom: 0;
}

.app-field :deep(.n-form-item-blank) {
  display: block;
  width: 100%;
  min-width: 0;
}

.app-field :deep(.n-form-item-label) {
  overflow: visible;
}

.app-field__label {
  display: inline-flex;
  align-items: center;
}

.app-field__req {
  flex-shrink: 0;
  margin-left: 0.15em;
  color: var(--color-danger);
  font-weight: 700;
}

.app-field__body {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.app-field__body :deep(.n-input),
.app-field__body :deep(.n-base-selection),
.app-field__body :deep(.n-date-picker) {
  width: 100%;
}

.app-field__hint {
  margin: var(--space-2) 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
</style>
