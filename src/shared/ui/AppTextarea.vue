<script setup lang="ts">
import { computed } from 'vue'
import { NInput } from 'naive-ui'

withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    rows?: number
    required?: boolean
    disabled?: boolean
  }>(),
  {
    rows: 4,
    required: false,
    disabled: false,
  },
)

const model = defineModel<string>({ required: true })

const value = computed({
  get: () => model.value,
  set: (next: string) => {
    model.value = next
  },
})
</script>

<template>
  <NInput
    v-model:value="value"
    class="app-textarea"
    type="textarea"
    size="large"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    :input-props="{ id, required }"
  />
</template>

<style scoped>
.app-textarea {
  width: 100%;
}

.app-textarea :deep(.n-input-wrapper) {
  width: 100%;
}

.app-textarea :deep(textarea) {
  width: 100%;
  min-width: 0;
  resize: vertical;
}
</style>
