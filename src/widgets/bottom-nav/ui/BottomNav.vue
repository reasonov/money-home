<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const links = [
  {
    to: '/',
    label: 'Главная',
    icon: 'home',
  },
  {
    to: '/history',
    label: 'История',
    icon: 'history',
  },
  {
    to: '/income',
    label: 'Доход',
    icon: 'income',
  },
  {
    to: '/settings',
    label: 'Ещё',
    icon: 'more',
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
    <RouterLink
      v-for="link in links"
      :key="link.to"
      class="nav__link"
      :class="{ 'is-active': isActive(link.to) }"
      :to="link.to"
    >
      <span class="nav__icon" aria-hidden="true">
        <svg v-if="link.icon === 'home'" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4.5 10.5 12 4l7.5 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-4V21H5.5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-else-if="link.icon === 'history'"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 7v5l3 2"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-else-if="link.icon === 'income'"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M5 18h14"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 7h14M5 12h14M5 17h14"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span class="nav__label">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  min-height: var(--nav-height);
  padding: var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.nav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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
