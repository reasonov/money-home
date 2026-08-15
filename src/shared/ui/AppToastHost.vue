<script setup lang="ts">
import { watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useToastState } from '../lib/toast'

const messageApi = useMessage()
const { message, ticket, visible } = useToastState()

watch(ticket, (value) => {
  if (!value || !message.value) return
  messageApi.success(message.value, { duration: 2200 })
})

watch(visible, (value) => {
  if (!value) {
    messageApi.destroyAll()
  }
})
</script>

<template>
  <span hidden />
</template>
