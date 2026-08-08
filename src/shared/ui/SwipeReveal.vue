<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    open?: boolean
    disabled?: boolean
    revealWidth?: number
  }>(),
  {
    open: false,
    disabled: false,
    revealWidth: 88,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  action: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const offset = ref(0)
const dragging = ref(false)
const armed = ref(false)

const REVEAL_SNAP = 0.55
const COMMIT_RATIO = 0.62
const AXIS_LOCK = 10

let pointerId: number | null = null
let startX = 0
let startY = 0
let startOffset = 0
let axis: 'x' | 'y' | null = null
let width = 0

const style = computed(() => ({
  transform: `translate3d(${offset.value}px, 0, 0)`,
  transition: dragging.value ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
}))

const progress = computed(() => {
  if (width <= 0) return 0
  return Math.min(1, Math.abs(offset.value) / width)
})

const actionMinWidth = computed(() => `${props.revealWidth}px`)

watch(
  () => props.open,
  (value) => {
    if (dragging.value) return
    offset.value = value ? -props.revealWidth : 0
    armed.value = value
  },
  { immediate: true },
)

function setOpen(value: boolean) {
  armed.value = value
  offset.value = value ? -props.revealWidth : 0
  emit('update:open', value)
}

function close() {
  setOpen(false)
}

function isInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [role="menuitem"]'))
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  if (isInteractive(event.target)) return

  const root = rootRef.value
  if (!root) return

  width = root.offsetWidth
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  startOffset = offset.value
  axis = null
  dragging.value = true
  root.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return

  const dx = event.clientX - startX
  const dy = event.clientY - startY

  if (!axis) {
    if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (axis === 'y') {
      dragging.value = false
      pointerId = null
      releasePointer(event)
      return
    }
  }

  if (axis !== 'x') return

  const next = Math.min(0, Math.max(-width, startOffset + dx))
  offset.value = next
  armed.value = Math.abs(next) >= props.revealWidth * REVEAL_SNAP
}

function releasePointer(event: PointerEvent) {
  const root = rootRef.value
  if (root?.hasPointerCapture(event.pointerId)) {
    root.releasePointerCapture(event.pointerId)
  }
}

function finishDrag(event: PointerEvent) {
  if (event.pointerId !== pointerId) return

  const wasDragging = dragging.value
  dragging.value = false
  pointerId = null
  releasePointer(event)

  if (!wasDragging || axis !== 'x') {
    axis = null
    return
  }
  axis = null

  const abs = Math.abs(offset.value)
  const commitAt = width * COMMIT_RATIO

  if (abs >= commitAt) {
    offset.value = -width
    window.setTimeout(() => {
      setOpen(false)
      emit('action')
    }, 160)
    return
  }

  if (abs >= props.revealWidth * REVEAL_SNAP) {
    setOpen(true)
    return
  }

  setOpen(false)
}

function onPointerUp(event: PointerEvent) {
  finishDrag(event)
}

function onPointerCancel(event: PointerEvent) {
  finishDrag(event)
}

function onActionClick(event: Event) {
  event.stopPropagation()
  setOpen(false)
  emit('action')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    close()
  }
}

onBeforeUnmount(() => {
  pointerId = null
})

defineExpose({ close })
</script>

<template>
  <div
    ref="rootRef"
    class="swipe"
    :class="{ 'is-armed': armed, 'is-dragging': dragging }"
    :style="{ '--swipe-progress': String(progress) }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
  >
    <div class="swipe__action" aria-hidden="true">
      <button type="button" class="swipe__action-btn" tabindex="-1" @click="onActionClick">
        {{ label }}
      </button>
    </div>
    <div class="swipe__content" :style="style">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  touch-action: pan-y;
  overflow: hidden;
  isolation: isolate;
}

.swipe__action {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  background: var(--color-success);
  z-index: 0;
}

.swipe__action-btn {
  display: grid;
  place-items: center;
  min-width: v-bind(actionMinWidth);
  padding: 0 var(--space-4);
  border: 0;
  background: transparent;
  color: var(--color-on-accent);
  font-weight: 800;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  transform: scale(calc(0.92 + var(--swipe-progress) * 0.12));
  opacity: calc(0.55 + var(--swipe-progress) * 0.45);
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.swipe.is-armed .swipe__action-btn,
.swipe.is-dragging .swipe__action-btn {
  opacity: 1;
  transform: scale(1);
}

.swipe__content {
  position: relative;
  z-index: 1;
  will-change: transform;
  background: transparent;
}
</style>
