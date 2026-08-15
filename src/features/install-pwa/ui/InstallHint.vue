<script setup lang="ts">
import { Share, X } from '@lucide/vue'
import { AppButton } from '@/shared'
import { useInstallHint } from '../lib/useInstallHint'

const { visible, platform, safari, canPrompt, dismiss, install } = useInstallHint()
</script>

<template>
  <aside v-if="visible" class="hint" role="note">
    <div class="hint__head">
      <h2 class="hint__title">На главный экран</h2>
      <button type="button" class="hint__close" aria-label="Скрыть подсказку" @click="dismiss">
        <X :size="18" :stroke-width="2" />
      </button>
    </div>

    <ol v-if="platform === 'ios' && safari" class="hint__steps">
      <li>
        Нажмите
        <span class="hint__action">
          <Share :size="14" :stroke-width="2.2" />
          Поделиться
        </span>
        внизу Safari
      </li>
      <li>Выберите «На экран „Домой“»</li>
    </ol>

    <ol v-else-if="platform === 'ios'" class="hint__steps">
      <li>Откройте этот сайт в Safari</li>
      <li>
        Нажмите
        <span class="hint__action">
          <Share :size="14" :stroke-width="2.2" />
          Поделиться
        </span>
        и выберите «На экран „Домой“»
      </li>
    </ol>

    <template v-else-if="platform === 'android'">
      <p v-if="canPrompt" class="hint__text">
        Установите приложение — оно откроется с главного экрана, без адресной строки.
      </p>
      <ol v-else class="hint__steps">
        <li>Откройте меню браузера (⋮)</li>
        <li>Выберите «Установить приложение» или «Добавить на главный экран»</li>
      </ol>
      <AppButton v-if="canPrompt" block @click="install">Установить</AppButton>
    </template>
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

.hint__text,
.hint__steps {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.hint__steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-left: 1.15rem;
}

.hint__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text);
  font-weight: 700;
}
</style>
