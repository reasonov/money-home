<script setup lang="ts">
import { h } from 'vue'
import type { SelectRenderLabel } from 'naive-ui'
import { AppSelect } from '@/shared'
import type { Category } from '../model/types'
import CategoryIcon from './CategoryIcon.vue'

defineProps<{
  id?: string
  categories: Category[]
  required?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}>()

const model = defineModel<string>({ required: true })

const renderLabel: SelectRenderLabel = (option) => {
  const extra = option as { icon?: string; color?: string; label?: string }
  const icon = extra.icon ?? ''
  const color = extra.color ?? ''
  const label = extra.label ?? ''
  if (!icon || !color) {
    return label
  }
  return h('span', { class: 'cat-select-label' }, [
    h(CategoryIcon, { icon, color, size: 22 }),
    h('span', label),
  ])
}
</script>

<template>
  <AppSelect :id="id" v-model="model" :required="required" :render-label="renderLabel">
    <option v-if="allowEmpty" value="">{{ emptyLabel ?? 'Без категории' }}</option>
    <option
      v-for="cat in categories"
      :key="cat.id"
      :value="cat.id"
      :data-icon="cat.icon"
      :data-color="cat.color"
    >
      {{ cat.name }}
    </option>
  </AppSelect>
</template>

<style>
.cat-select-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
</style>
