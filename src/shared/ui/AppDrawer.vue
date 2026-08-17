<script setup lang="ts">
import { computed } from 'vue'
import { NDrawer, NDrawerContent } from 'naive-ui'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title?: string
    height?: string | number
  }>(),
  {
    height: 'auto',
  },
)

const isAutoHeight = computed(() => props.height === 'auto')
</script>

<template>
  <NDrawer
    v-model:show="open"
    class="app-drawer"
    :class="{ 'app-drawer--auto': isAutoHeight }"
    placement="bottom"
    :height="height"
    :auto-focus="false"
    :trap-focus="true"
    :z-index="2000000000"
  >
    <NDrawerContent
      :title="title"
      closable
      :native-scrollbar="isAutoHeight"
      header-style="padding-bottom: 8px"
    >
      <slot />
    </NDrawerContent>
  </NDrawer>
</template>

<style>
.app-drawer.app-drawer--auto {
  max-height: min(80dvh, 100%);
}
</style>
