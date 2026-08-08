<script setup lang="ts">
import type { ThemePreference } from '@/shared'
import { useThemeStore } from '../model/store'

const theme = useThemeStore()

const options: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Система' },
]

function select(value: ThemePreference) {
  theme.setPreference(value)
}
</script>

<template>
  <div class="theme-switch" role="radiogroup" aria-label="Тема оформления">
    <button
      v-for="option in options"
      :key="option.value"
      class="theme-switch__option"
      :class="{ 'is-active': theme.preference === option.value }"
      type="button"
      role="radio"
      :aria-checked="theme.preference === option.value"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.theme-switch__option {
  min-height: 44px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.theme-switch__option.is-active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
}

.theme-switch__option:hover:not(.is-active) {
  color: var(--color-text);
}
</style>
