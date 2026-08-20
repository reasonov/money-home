<script setup lang="ts">
import { ref } from 'vue'
import { X } from '@lucide/vue'
import { AppButton, getErrorMessage, showToast } from '@/shared'
import { repeatSuggestionMessage, repeatSuggestionTitle } from '../lib/copy'
import { useRepeatSuggestion } from '../lib/useRepeatSuggestion'

const { suggestion, dismiss, accept } = useRepeatSuggestion()
const pending = ref(false)

async function onAccept() {
  if (pending.value) {
    return
  }
  pending.value = true
  try {
    await accept()
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось сохранить'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <aside v-if="suggestion" class="hint" role="note">
    <div class="hint__head">
      <h2 class="hint__title">{{ repeatSuggestionTitle(suggestion) }}</h2>
      <button type="button" class="hint__close" aria-label="Скрыть предложение" @click="dismiss">
        <X :size="18" :stroke-width="2" />
      </button>
    </div>
    <p class="hint__text">{{ repeatSuggestionMessage(suggestion) }}</p>
    <AppButton block :disabled="pending" @click="onAccept">Добавить</AppButton>
  </aside>
</template>

<style scoped>
.hint {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.hint__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.hint__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.hint__close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -10px -10px -10px 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.hint__text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
