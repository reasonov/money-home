<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title?: string
}>()

const panelRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function close() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) {
    return
  }
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) {
    return
  }
  const focusable = panelRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable.length) {
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
  if (value) {
    previousFocus = document.activeElement as HTMLElement | null
    await nextTick()
    closeBtnRef.value?.focus()
    return
  }
  previousFocus?.focus()
  previousFocus = null
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="app-drawer" role="dialog" aria-modal="true" :aria-label="title">
      <button type="button" class="app-drawer__backdrop" aria-label="Закрыть" @click="close" />
      <div ref="panelRef" class="app-drawer__panel">
        <div class="app-drawer__handle" aria-hidden="true" />
        <header class="app-drawer__header">
          <h2 v-if="title" class="app-drawer__title">{{ title }}</h2>
          <button
            ref="closeBtnRef"
            type="button"
            class="app-drawer__close"
            aria-label="Закрыть"
            @click="close"
          >
            ×
          </button>
        </header>
        <div class="app-drawer__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-drawer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.app-drawer__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: var(--color-overlay);
  cursor: pointer;
}

.app-drawer__panel {
  position: relative;
  z-index: 1;
  width: min(100%, var(--app-max-width));
  max-height: min(85vh, 640px);
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: 0 -8px 24px var(--color-shadow);
  animation: drawer-up 0.22s ease;
}

.app-drawer__handle {
  width: 40px;
  height: 4px;
  margin: 0 auto var(--space-3);
  border-radius: 2px;
  background: var(--color-border);
}

.app-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.app-drawer__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-text);
}

.app-drawer__close {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin: -6px -8px 0 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.app-drawer__close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.app-drawer__body {
  overflow: auto;
  min-height: 0;
}

@keyframes drawer-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
