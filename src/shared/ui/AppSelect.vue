<script setup lang="ts">
import { computed, Fragment, useSlots, type VNode } from 'vue'
import { NSelect, type SelectFilter, type SelectRenderLabel } from 'naive-ui'

type SelectOption = {
  value: string
  label: string
  disabled: boolean
  icon?: string
  color?: string
}

const props = withDefaults(
  defineProps<{
    id?: string
    required?: boolean
    disabled?: boolean
    multiple?: boolean
    filterable?: boolean
    clearable?: boolean
    placeholder?: string
    filter?: SelectFilter
    renderLabel?: SelectRenderLabel
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'large',
  },
)

const model = defineModel<string | number | string[]>({ required: true })
const slots = useSlots()

function textOf(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && node !== null && 'children' in node) {
    return textOf((node as VNode).children)
  }
  return ''
}

function dataAttr(nodeProps: Record<string, unknown> | null | undefined, key: string) {
  if (!nodeProps) return undefined
  const raw = nodeProps[key] ?? nodeProps[key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())]
  return raw == null || raw === '' ? undefined : String(raw)
}

function collectOptions(nodes: VNode[] | undefined): SelectOption[] {
  if (!nodes) return []
  const result: SelectOption[] = []
  for (const node of nodes) {
    if (node.type === Fragment) {
      result.push(...collectOptions(node.children as VNode[]))
      continue
    }
    if (node.type !== 'option') continue
    const raw = node.props?.value
    const label = textOf(node.children).trim()
    result.push({
      value: raw == null ? label : String(raw),
      label,
      disabled: node.props?.disabled === '' || node.props?.disabled === true,
      icon: dataAttr(node.props, 'data-icon'),
      color: dataAttr(node.props, 'data-color'),
    })
  }
  return result
}

const options = computed(() => collectOptions(slots.default?.()))

type SelectValue = string | number | Array<string | number> | null

const value = computed({
  get: (): SelectValue => {
    if (props.multiple) {
      return Array.isArray(model.value) ? model.value : []
    }
    return model.value == null ? null : String(model.value)
  },
  set: (next: SelectValue) => {
    if (props.multiple) {
      model.value = Array.isArray(next) ? next.map(String) : []
      return
    }
    model.value = next == null ? '' : String(next)
  },
})

function onNativeChange(event: Event) {
  const el = event.target as HTMLSelectElement
  if (props.multiple) {
    model.value = Array.from(el.selectedOptions).map((item) => item.value)
    return
  }
  model.value = el.value
}

function isSelected(optionValue: string) {
  if (props.multiple) {
    return Array.isArray(model.value) && model.value.includes(optionValue)
  }
  return String(model.value) === optionValue
}
</script>

<template>
  <div class="app-select">
    <select
      class="app-select__native"
      :id="id ? `${id}-native` : undefined"
      :required="required"
      :disabled="disabled"
      :multiple="multiple"
      tabindex="-1"
      aria-hidden="true"
      @change="onNativeChange"
    >
      <option
        v-for="item in options"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        :selected="isSelected(item.value)"
      >
        {{ item.label }}
      </option>
    </select>
    <NSelect
      v-model:value="value"
      :options="options"
      :disabled="disabled"
      :multiple="multiple"
      :filterable="filterable"
      :clearable="clearable"
      :placeholder="placeholder"
      :filter="filter"
      :render-label="renderLabel"
      :max-tag-count="multiple ? 'responsive' : undefined"
      :size="size"
    />
    <div class="app-select__slot" hidden><slot /></div>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
}

.app-select__native,
.app-select__slot {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
