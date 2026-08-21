<script setup lang="ts">
import { computed } from 'vue'
import { NInput } from 'naive-ui'
import { sanitizeAmountInput } from '../lib/parseAmount'

const props = defineProps<{
  id?: string
  min?: number
  max?: number
  disabled?: boolean
  placeholder?: string
}>()

const model = defineModel<string | number>({ required: true })

const value = computed({
  get: () => sanitizeAmountInput(String(model.value ?? '')).replace('.', ','),
  set: (next: string) => {
    const sanitized = sanitizeAmountInput(next)
    if (sanitized === '') {
      model.value = ''
      return
    }
    const amount = Number(sanitized)
    if (props.max != null && Number.isFinite(amount) && amount > props.max) {
      model.value = String(props.max)
      return
    }
    model.value = sanitized
  },
})
</script>

<template>
  <NInput
    v-model:value="value"
    class="app-input-number"
    size="large"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{
      id,
      inputmode: 'decimal',
      autocomplete: 'off',
    }"
  />
</template>

<style scoped>
.app-input-number {
  width: 100%;
}

.app-input-number :deep(.n-input__input-el) {
  font-variant-numeric: tabular-nums;
}
</style>
