<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { NSwitch } from 'naive-ui'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = withDefaults(
  defineProps<{
    checked?: boolean
    disabled?: boolean
    loading?: boolean
    size?: 'small' | 'medium' | 'large'
  }>(),
  {
    size: 'medium',
  },
)

const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()

const model = defineModel<boolean>()

const value = computed({
  get: () => {
    if (props.checked !== undefined) {
      return props.checked
    }
    return model.value ?? false
  },
  set: (next: boolean) => {
    model.value = next
    emit('update:checked', next)
  },
})
</script>

<template>
  <span class="switch">
    <NSwitch
      v-bind="attrs"
      v-model:value="value"
      :disabled="disabled"
      :loading="loading"
      :size="size"
    />
  </span>
</template>

<style scoped>
.switch {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}
</style>
