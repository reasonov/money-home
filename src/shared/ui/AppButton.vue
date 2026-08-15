<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'

const props = withDefaults(
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

const naiveType = computed(() => {
  if (props.variant === 'danger') return 'error' as const
  if (props.variant === 'primary' || props.variant === 'ghost') return 'primary' as const
  return 'default' as const
})
</script>

<template>
  <NButton
    size="large"
    :attr-type="type"
    :type="naiveType"
    :secondary="variant === 'secondary'"
    :quaternary="variant === 'ghost'"
    :block="block"
    :disabled="disabled"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <slot />
  </NButton>
</template>
