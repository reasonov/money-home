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

const value = computed(() => props.checked ?? model.value ?? false)

function onUpdate(next: boolean) {
  model.value = next
  emit('update:checked', next)
}
</script>

<template>
  <span class="switch">
    <NSwitch
      v-bind="attrs"
      :value="value"
      :disabled="disabled"
      :loading="loading"
      :size="size"
      @update:value="onUpdate"
    />
  </span>
</template>

<style scoped>
.switch {
  display: inline-flex;
  align-items: center;
}
</style>
