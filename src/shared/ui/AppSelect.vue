<script setup lang="ts">
import {
  computed,
  Fragment,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useSlots,
  watch,
  type VNode,
} from 'vue'

const props = defineProps<{
  id?: string
  required?: boolean
  disabled?: boolean
}>()

const model = defineModel<string | number>({ required: true })

const slots = useSlots()
const root = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(-1)

type SelectOption = {
  value: string
  label: string
  disabled: boolean
}

function textOf(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && node !== null && 'children' in node) {
    return textOf((node as VNode).children)
  }
  return ''
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
    })
  }
  return result
}

const options = computed(() => collectOptions(slots.default?.()))

const selectedLabel = computed(() => {
  const match = options.value.find((item) => item.value === String(model.value))
  return match?.label ?? ''
})

const enabledIndexes = computed(() =>
  options.value.reduce<number[]>((acc, item, index) => {
    if (!item.disabled) acc.push(index)
    return acc
  }, []),
)

function close() {
  open.value = false
  activeIndex.value = -1
}

function openList() {
  if (props.disabled) return
  open.value = true
  const selected = options.value.findIndex((item) => item.value === String(model.value))
  activeIndex.value = selected >= 0 ? selected : (enabledIndexes.value[0] ?? -1)
  nextTick(() => {
    const active = listRef.value?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function toggle() {
  if (open.value) close()
  else openList()
}

function choose(option: SelectOption) {
  if (option.disabled) return
  model.value = option.value
  close()
}

function moveActive(delta: number) {
  const indexes = enabledIndexes.value
  if (!indexes.length) return
  const currentPos = indexes.indexOf(activeIndex.value)
  const nextPos =
    currentPos === -1
      ? delta > 0
        ? 0
        : indexes.length - 1
      : (currentPos + delta + indexes.length) % indexes.length
  activeIndex.value = indexes[nextPos]!
  nextTick(() => {
    const active = listRef.value?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) openList()
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!open.value) {
      openList()
      return
    }
    const option = options.value[activeIndex.value]
    if (option) choose(option)
    return
  }

  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close()
  }
}

function onDocPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}

watch(
  () => props.disabled,
  (value) => {
    if (value) close()
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
})
</script>

<template>
  <div ref="root" class="app-select" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <select
      class="app-select__native"
      :id="id ? `${id}-native` : undefined"
      :value="String(model)"
      :required="required"
      :disabled="disabled"
      tabindex="-1"
      aria-hidden="true"
      @change="model = ($event.target as HTMLSelectElement).value"
    >
      <slot />
    </select>

    <button
      :id="id"
      type="button"
      class="app-select__trigger"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="app-select__value">{{ selectedLabel }}</span>
      <span class="app-select__chevron" aria-hidden="true" />
    </button>

    <ul
      v-show="open"
      ref="listRef"
      class="app-select__list"
      role="listbox"
      :aria-labelledby="id"
      @click.stop
    >
      <li
        v-for="(option, index) in options"
        :key="option.value"
        class="app-select__option"
        :class="{
          'is-selected': option.value === String(model),
          'is-disabled': option.disabled,
        }"
        role="option"
        :aria-selected="option.value === String(model)"
        :aria-disabled="option.disabled || undefined"
        :data-active="index === activeIndex ? 'true' : undefined"
        @click="choose(option)"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
}

.app-select__native {
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

.app-select__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  min-height: 48px;
  padding: 0 2.5rem 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
}

.app-select__trigger:focus {
  border-color: var(--color-accent);
}

.app-select.is-open .app-select__trigger {
  border-color: var(--color-accent);
}

.app-select__trigger:disabled {
  opacity: 0.6;
  background: var(--color-bg);
  cursor: not-allowed;
}

.app-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select__chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  width: 0.65rem;
  height: 0.65rem;
  border-right: 2px solid var(--color-text-muted);
  border-bottom: 2px solid var(--color-text-muted);
  transform: translateY(-65%) rotate(45deg);
  transition: transform 0.15s ease;
  pointer-events: none;
}

.app-select.is-open .app-select__chevron {
  transform: translateY(-25%) rotate(225deg);
}

.app-select__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  max-height: 240px;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px var(--color-shadow);
}

.app-select__option {
  padding: 0.625rem var(--space-3);
  border-radius: calc(var(--radius-sm) - 4px);
  cursor: pointer;
}

.app-select__option:hover:not(.is-disabled),
.app-select__option[data-active='true']:not(.is-disabled) {
  background: var(--color-bg);
}

.app-select__option.is-selected {
  color: var(--color-accent);
  font-weight: 600;
}

.app-select__option.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
