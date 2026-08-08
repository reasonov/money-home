<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { settleConfirm, useConfirmState } from '../lib/confirm'
import AppButton from './AppButton.vue'

const state = useConfirmState()
const panelRef = ref<HTMLElement | null>(null)
const confirmBtnRef = ref<InstanceType<typeof AppButton> | null>(null)
let previousFocus: HTMLElement | null = null

watch(
  () => state.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      const el = confirmBtnRef.value?.$el as HTMLElement | undefined
      el?.focus()
      return
    }
    document.body.style.overflow = ''
    previousFocus?.focus()
    previousFocus = null
  },
)

function onKeydown(event: KeyboardEvent) {
  if (!state.open) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    settleConfirm(false)
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
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="confirm"
      role="dialog"
      aria-modal="true"
      :aria-label="state.title"
      @keydown="onKeydown"
    >
      <button type="button" class="confirm__backdrop" aria-label="Закрыть" @click="settleConfirm(false)" />
      <div ref="panelRef" class="confirm__panel">
        <h2 class="confirm__title">{{ state.title }}</h2>
        <p class="confirm__message">{{ state.message }}</p>
        <div class="confirm__actions">
          <AppButton variant="secondary" block @click="settleConfirm(false)">
            {{ state.cancelLabel }}
          </AppButton>
          <AppButton
            ref="confirmBtnRef"
            :variant="state.danger ? 'danger' : 'primary'"
            block
            @click="settleConfirm(true)"
          >
            {{ state.confirmLabel }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.confirm__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: var(--color-overlay);
  cursor: pointer;
}

.confirm__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 360px);
  padding: var(--space-5);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px var(--color-shadow);
}

.confirm__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
}

.confirm__message {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.confirm__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-5);
}
</style>
