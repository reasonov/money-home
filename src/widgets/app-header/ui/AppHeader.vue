<script setup lang="ts">
import { APP_VERSION } from '@/shared'

withDefaults(
  defineProps<{
    title?: string
    showBrand?: boolean
  }>(),
  {
    title: '',
    showBrand: true,
  },
)
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <div class="header__text">
        <p v-if="showBrand" class="header__brand">
          <span>Money Home</span>
          <span class="header__version">{{ APP_VERSION }}</span>
        </p>
        <h1 v-if="title" class="header__title">{{ title }}</h1>
        <slot />
      </div>
      <div v-if="$slots.actions" class="header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding-top: env(safe-area-inset-top);
  background: var(--color-header-bg);
  backdrop-filter: blur(8px) saturate(1.15);
  -webkit-backdrop-filter: blur(8px) saturate(1.15);
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  box-shadow: 0 8px 24px -18px var(--color-shadow);
}

.header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--space-4) * -1);
  height: var(--space-4);
  pointer-events: none;
  background: linear-gradient(to bottom, var(--color-header-bg-soft), transparent);
}

.header__inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: var(--header-height);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.header__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.header__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.header__brand {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.header__version {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--color-text-muted);
}

.header__title {
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.2;
}
</style>
