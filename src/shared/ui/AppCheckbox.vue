<script setup lang="ts">
import { computed } from 'vue'
import { NCheckbox } from 'naive-ui'

const props = defineProps<{
  checked?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()

const model = defineModel<boolean>()

const value = computed({
  get: () => model.value ?? props.checked ?? false,
  set: (next: boolean) => {
    model.value = next
    emit('update:checked', next)
  },
})
</script>

<template>
  <NCheckbox v-model:checked="value" :disabled="disabled">
    <slot />
  </NCheckbox>
</template>
