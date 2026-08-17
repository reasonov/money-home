<script setup lang="ts">
import { NDrawer, NDrawerContent } from 'naive-ui'

const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    title?: string
    height?: string | number
  }>(),
  {
    height: 'auto',
  },
)
</script>

<template>
  <NDrawer
    v-model:show="open"
    placement="bottom"
    :height="height"
    :auto-focus="false"
    :trap-focus="true"
    :z-index="2000000000"
  >
    <NDrawerContent
      :title="title"
      closable
      :native-scrollbar="false"
      header-style="padding-bottom: 8px"
    >
      <slot />
    </NDrawerContent>
  </NDrawer>
</template>
