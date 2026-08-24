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

type SelectGroup = {
  type: 'group'
  key: string
  label: string
  children: SelectOption[]
}

type SelectNode = SelectOption | SelectGroup

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

function optionFromNode(node: VNode): SelectOption {
  const raw = node.props?.value
  const label = textOf(node.children).trim()
  return {
    value: raw == null ? label : String(raw),
    label,
    disabled: node.props?.disabled === '' || node.props?.disabled === true,
    icon: dataAttr(node.props, 'data-icon'),
    color: dataAttr(node.props, 'data-color'),
  }
}

function collectOptions(nodes: VNode[] | undefined): SelectNode[] {
  if (!nodes) return []
  const result: SelectNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment) {
      result.push(...collectOptions(node.children as VNode[]))
      continue
    }
    if (node.type === 'optgroup') {
      const label = String(node.props?.label ?? '')
      const children = collectOptions(
        Array.isArray(node.children) ? (node.children as VNode[]) : undefined,
      ).filter((item): item is SelectOption => !('type' in item && item.type === 'group'))
      result.push({
        type: 'group',
        key: label || `group-${result.length}`,
        label,
        children,
      })
      continue
    }
    if (node.type !== 'option') continue
    result.push(optionFromNode(node))
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

function isGroup(item: SelectNode): item is SelectGroup {
  return 'type' in item && item.type === 'group'
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
      <template v-for="(item, index) in options" :key="isGroup(item) ? item.key : item.value">
        <optgroup v-if="isGroup(item)" :label="item.label">
          <option
            v-for="child in item.children"
            :key="child.value"
            :value="child.value"
            :disabled="child.disabled"
            :selected="isSelected(child.value)"
          >
            {{ child.label }}
          </option>
        </optgroup>
        <option
          v-else
          :value="item.value"
          :disabled="item.disabled"
          :selected="isSelected(item.value)"
        >
          {{ item.label }}
        </option>
      </template>
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
