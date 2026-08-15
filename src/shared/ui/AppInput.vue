<script setup lang="ts">
import { computed } from 'vue'
import { NDatePicker, NInput } from 'naive-ui'

const props = defineProps<{
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

const isDate = computed(() => props.type === 'date')
const inputType = computed(() => (props.type === 'password' ? 'password' : 'text'))

const textValue = computed({
  get: () => String(model.value ?? ''),
  set: (value: string) => {
    model.value = value
  },
})

const dateValue = computed({
  get: () => (model.value ? String(model.value) : null),
  set: (value: string | null) => {
    model.value = value ?? ''
  },
})
</script>

<template>
  <NDatePicker
    v-if="isDate"
    v-model:formatted-value="dateValue"
    class="app-input-date"
    type="date"
    format="dd.MM.yyyy"
    value-format="yyyy-MM-dd"
    size="large"
    :disabled="disabled"
    :input-readonly="false"
  />
  <NInput
    v-else
    v-model:value="textValue"
    size="large"
    :id="id"
    :type="inputType"
    :placeholder="placeholder"
    :disabled="disabled"
    :show-password-on="type === 'password' ? 'click' : undefined"
    :input-props="{
      id,
      type: type === 'password' || type === 'date' ? undefined : type,
      min: min != null ? String(min) : undefined,
      max: max != null ? String(max) : undefined,
      step: step != null ? String(step) : undefined,
      inputmode,
      autocomplete,
      required,
    }"
  />
</template>

<style scoped>
.app-input-date {
  width: 100%;
}
</style>
