<script setup lang="ts">
import { watch } from 'vue'
import { useDialog } from 'naive-ui'
import { settleConfirm, useConfirmState } from '../lib/confirm'

const dialog = useDialog()
const state = useConfirmState()

watch(
  () => state.open,
  (open) => {
    if (!open) return
    const kind = state.kind
    dialog[kind]({
      title: state.title,
      content: state.message,
      positiveText: state.confirmLabel,
      negativeText: state.cancelLabel ?? undefined,
      closable: true,
      maskClosable: true,
      autoFocus: true,
      onPositiveClick: () => {
        settleConfirm(true)
      },
      onNegativeClick: () => {
        settleConfirm(false)
      },
      onClose: () => {
        settleConfirm(false)
      },
    })
  },
)
</script>

<template>
  <span hidden />
</template>
