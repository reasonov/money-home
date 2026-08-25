<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import { NAV_ITEM_BY_ID, openFormDrawer, type NavItem } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { usePreferencesStore } from '@/entities/preferences'

const HOLD_MS = 400

const route = useRoute()
const accounts = useAccountStore()
const prefs = usePreferencesStore()

const items = computed(() => prefs.bottomNav.map((id) => NAV_ITEM_BY_ID[id]))
const leftLinks = computed(() => items.value.slice(0, 2))
const rightLinks = computed(() => items.value.slice(2, 4))

const held = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | null = null

const hasAccounts = computed(() => accounts.items.length > 0)

function isActive(item: NavItem) {
  if (!item.to) {
    return false
  }
  if (item.to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(item.to)
}

function clearHoldTimer() {
  if (holdTimer != null) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
}

function openPrimary() {
  if (!hasAccounts.value) {
    openFormDrawer({ name: 'account' })
    return
  }
  openFormDrawer({ name: 'expense' })
}

function openIncome() {
  if (!hasAccounts.value) {
    openFormDrawer({ name: 'account' })
    return
  }
  openFormDrawer({ name: 'income' })
}

function activate(item: NavItem) {
  if (item.action === 'transfer') {
    openFormDrawer({ name: 'transfer' })
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }
  held.value = false
  clearHoldTimer()
  holdTimer = setTimeout(() => {
    held.value = true
    holdTimer = null
    openIncome()
  }, HOLD_MS)
}

function onPointerUp() {
  clearHoldTimer()
  if (held.value) {
    window.setTimeout(() => {
      held.value = false
    }, 0)
  }
}

function onPointerCancel() {
  clearHoldTimer()
}

function onPointerLeave(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || held.value) {
    return
  }
  clearHoldTimer()
}

function onClick(event: MouseEvent) {
  if (held.value) {
    event.preventDefault()
    return
  }
  openPrimary()
}

onBeforeUnmount(() => {
  clearHoldTimer()
})
</script>

<template>
  <nav class="nav" data-tour="nav-expense" aria-label="Основная навигация">
    <div class="nav__cluster">
      <span v-for="item in leftLinks" :key="item.id" class="nav__hit">
        <RouterLink
          v-if="item.to"
          class="nav__link"
          :class="{ 'is-active': isActive(item) }"
          :to="item.to"
        >
          <span class="nav__icon" aria-hidden="true">
            <component :is="item.icon" :size="22" :stroke-width="1.7" />
          </span>
          <span class="nav__label">{{ item.label }}</span>
        </RouterLink>
        <button v-else type="button" class="nav__link" @click="activate(item)">
          <span class="nav__icon" aria-hidden="true">
            <component :is="item.icon" :size="22" :stroke-width="1.7" />
          </span>
          <span class="nav__label">{{ item.label }}</span>
        </button>
      </span>
    </div>

    <div class="nav__action">
      <div class="nav__fab">
        <button
          type="button"
          class="nav__plus"
          aria-label="Добавить расход. Удерживайте, чтобы добавить доход"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @pointerleave="onPointerLeave"
          @click="onClick"
          @contextmenu.prevent
        >
          <Plus :size="24" :stroke-width="2.2" />
        </button>
      </div>
    </div>

    <div class="nav__cluster">
      <span v-for="item in rightLinks" :key="item.id" class="nav__hit">
        <RouterLink
          v-if="item.to"
          class="nav__link"
          :class="{ 'is-active': isActive(item) }"
          :to="item.to"
        >
          <span class="nav__icon" aria-hidden="true">
            <component :is="item.icon" :size="22" :stroke-width="1.7" />
          </span>
          <span class="nav__label">{{ item.label }}</span>
        </RouterLink>
        <button v-else type="button" class="nav__link" @click="activate(item)">
          <span class="nav__icon" aria-hidden="true">
            <component :is="item.icon" :size="22" :stroke-width="1.7" />
          </span>
          <span class="nav__label">{{ item.label }}</span>
        </button>
      </span>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr var(--nav-fab-size) 1fr;
  gap: var(--space-2);
  width: 100%;
  max-width: var(--app-max-width);
  min-height: var(--nav-height);
  margin-inline: auto;
  padding: var(--space-2) var(--space-1) calc(var(--space-2) + env(safe-area-inset-bottom));
  overflow: visible;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.nav__cluster {
  display: flex;
  min-width: 0;
}

.nav__hit {
  display: flex;
  flex: 1;
  min-width: 0;
}

.nav__link {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
  cursor: pointer;
}

.nav__link.is-active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.nav__link:hover {
  text-decoration: none;
}

.nav__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
}

.nav__label {
  max-width: 100%;
  overflow: hidden;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav__action {
  position: relative;
  align-self: stretch;
}

.nav__fab {
  position: absolute;
  top: calc(-1 * var(--space-2));
  left: 50%;
  z-index: 1;
  transform: translate(-50%, -50%);
}

.nav__plus {
  display: grid;
  place-items: center;
  width: var(--nav-fab-size);
  height: var(--nav-fab-size);
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
  box-shadow:
    0 0 0 6px var(--color-bg),
    0 4px 12px var(--color-shadow);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}

.nav__plus:active {
  background: var(--color-accent-hover);
}
</style>
