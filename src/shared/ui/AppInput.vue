<script setup lang="ts">
import { computed } from 'vue'
import { NDatePicker, NInput } from 'naive-ui'

const props = withDefaults(
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
    clearable?: boolean
    disabled?: boolean
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'large',
    clearable: false,
  },
)

const model = defineModel<string | number>({ required: true })

const isDate = computed(() => props.type === 'date')
const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value ? 'password' : 'text'))

const nativeInputProps = computed(() => {
  const attrs: Record<string, string | boolean | undefined> = {
    id: props.id,
    min: props.min != null ? String(props.min) : undefined,
    max: props.max != null ? String(props.max) : undefined,
    step: props.step != null ? String(props.step) : undefined,
    inputmode: props.inputmode,
    autocomplete: props.autocomplete,
    required: props.required,
  }
  if (props.type && props.type !== 'password' && props.type !== 'date') {
    attrs.type = props.type
  }
  return attrs
})

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
    :size="size"
    :disabled="disabled"
    :clearable="clearable"
    :input-readonly="false"
  />
  <NInput
    v-else
    v-model:value="textValue"
    :size="size"
    :id="id"
    :type="inputType"
    :placeholder="placeholder"
    :disabled="disabled"
    :show-password-on="isPassword ? 'click' : undefined"
    :input-props="nativeInputProps"
  />
</template>

<style scoped>
.app-input-date {
  width: 100%;
}
</style>
