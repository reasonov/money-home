<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { readDocumentTheme } from '@/shared'
import { resolveTone } from '../lib/colorFamilies'

const props = withDefaults(
  defineProps<{
    color: string
    variant?: 'stripe' | 'dot'
  }>(),
  { variant: 'dot' },
)

const tick = ref(0)
let observer: MutationObserver | undefined

onMounted(() => {
  tick.value += 1
  observer = new MutationObserver(() => {
    tick.value += 1
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onUnmounted(() => observer?.disconnect())

const displayColor = computed(() => {
  void tick.value
  return resolveTone(props.color, readDocumentTheme())
})
</script>

<template>
  <span
    class="mark"
    :class="`is-${variant}`"
    :style="{ background: displayColor }"
    aria-hidden="true"
  />
</template>

<style scoped>
.mark {
  flex-shrink: 0;
  display: block;
}

.mark.is-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.mark.is-stripe {
  width: 4px;
  align-self: stretch;
  min-height: 28px;
  border-radius: 99px;
}
</style>
