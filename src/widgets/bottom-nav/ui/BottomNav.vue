<script setup lang="ts">
import { CalendarCheck, House, PieChart } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const links = [
  {
    to: '/',
    label: 'Главная',
    icon: House,
    tour: 'nav-home',
  },
  {
    to: '/stats',
    label: 'Статистика',
    icon: PieChart,
    tour: 'nav-stats',
  },
  {
    to: '/calendar',
    label: 'Планирование',
    icon: CalendarCheck,
    tour: 'nav-calendar',
  },
] as const

function isActive(path: string) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="nav" aria-label="Основная навигация">
    <span v-for="link in links" :key="link.to" class="nav__hit" :data-tour="link.tour">
      <RouterLink class="nav__link" :class="{ 'is-active': isActive(link.to) }" :to="link.to">
        <span class="nav__icon" aria-hidden="true">
          <component :is="link.icon" :size="22" :stroke-width="1.7" />
        </span>
        <span class="nav__label">{{ link.label }}</span>
      </RouterLink>
    </span>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  width: 100%;
  max-width: var(--app-max-width);
  min-height: var(--nav-height);
  padding: var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  transform: translateX(-50%);
}

.nav.driver-active-element-parent {
  z-index: 10001;
}

.nav__hit {
  display: flex;
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
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
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
  line-height: 1.1;
}
</style>
