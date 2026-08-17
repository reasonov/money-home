<script setup lang="ts">
import { Menu } from '@lucide/vue'
import HeaderAccountSelect from './HeaderAccountSelect.vue'

withDefaults(
  defineProps<{
    showAccountSelect?: boolean
    title?: string
  }>(),
  {
    showAccountSelect: false,
    title: '',
  },
)

const emit = defineEmits<{
  menu: []
}>()
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <button
        type="button"
        class="header__icon"
        data-tour="header-menu"
        aria-label="Открыть меню"
        @click="emit('menu')"
      >
        <Menu :size="22" :stroke-width="1.8" />
      </button>
      <div class="header__center">
        <div v-if="showAccountSelect" class="header__select" data-tour="header-account">
          <HeaderAccountSelect />
        </div>
        <h1 v-else-if="title" class="header__title">{{ title }}</h1>
      </div>
      <div class="header__actions">
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
  align-items: center;
  gap: var(--space-3);
  min-height: var(--header-height);
  padding: var(--space-2) var(--space-4);
}

.header__center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.header__select {
  width: 100%;
  max-width: 280px;
}

.header__title {
  max-width: 100%;
  overflow: hidden;
  font-size: 1.0625rem;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 44px;
}

.header__icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
}
</style>
