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
    class="app-btn"
    :class="{ 'is-secondary': variant === 'secondary' }"
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

<style scoped>
.app-btn.is-secondary {
  --n-color: var(--color-accent-soft) !important;
  --n-color-hover: var(--color-accent-soft) !important;
  --n-color-pressed: var(--color-accent-soft) !important;
  --n-color-focus: var(--color-accent-soft) !important;
  --n-text-color: var(--color-accent) !important;
  --n-text-color-hover: var(--color-accent) !important;
  --n-text-color-pressed: var(--color-accent) !important;
  --n-text-color-focus: var(--color-accent) !important;
  --n-border: 1px solid var(--color-accent) !important;
  --n-border-hover: 1px solid var(--color-accent) !important;
  --n-border-pressed: 1px solid var(--color-accent) !important;
  --n-border-focus: 1px solid var(--color-accent) !important;
}
</style>
