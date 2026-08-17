<script setup lang="ts">
import { ChevronRight, SlidersHorizontal, User } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import { APP_VERSION, AppButton } from '@/shared'
import { replayProductTour } from '@/features/product-tour'
import { ThemeSwitch } from '@/features/theme-switch'
import { useAppUpdateStore } from '@/features/update-app'

const router = useRouter()
const update = useAppUpdateStore()

function replay() {
  replayProductTour()
  void router.push({ name: 'home' })
}
</script>

<template>
  <div class="settings">
    <section class="settings__block">
      <h2 class="settings__heading">Оформление</h2>
      <p class="settings__hint">Светлая, тёмная или как в системе</p>
      <div data-tour="settings-theme">
        <ThemeSwitch />
      </div>

      <h2 class="settings__heading settings__heading--spaced">Подсказки</h2>
      <p class="settings__hint">Короткий гайд по счетам, категориям и планированию</p>
      <AppButton variant="secondary" block @click="replay">Показать подсказки</AppButton>
    </section>

    <section class="settings__links">
      <RouterLink class="settings__row" to="/settings/profile" aria-label="Открыть профиль">
        <span class="settings__icon" aria-hidden="true">
          <User :size="18" :stroke-width="1.8" />
        </span>
        <span class="settings__title">Профиль</span>
        <span class="settings__chevron" aria-hidden="true">
          <ChevronRight :size="18" :stroke-width="1.8" />
        </span>
      </RouterLink>
      <RouterLink
        class="settings__row"
        to="/settings/personalization"
        aria-label="Открыть персонализацию"
      >
        <span class="settings__icon" aria-hidden="true">
          <SlidersHorizontal :size="18" :stroke-width="1.8" />
        </span>
        <span class="settings__title">Персонализация</span>
        <span class="settings__chevron" aria-hidden="true">
          <ChevronRight :size="18" :stroke-width="1.8" />
        </span>
      </RouterLink>
    </section>

    <p class="settings__version">Версия {{ APP_VERSION }}</p>
    <AppButton
      v-if="update.outdated"
      variant="secondary"
      block
      :disabled="update.applying"
      @click="update.apply"
    >
      {{ update.applying ? 'Обновление…' : `Обновить до ${update.latestVersion}` }}
    </AppButton>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.settings__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.settings__heading {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.settings__heading--spaced {
  margin-top: var(--space-2);
}

.settings__hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.settings__links {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.settings__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.settings__row:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.settings__row:last-of-type {
  padding-bottom: 0;
}

.settings__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.settings__title {
  flex: 1;
  min-width: 0;
}

.settings__chevron {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
}

.settings__version {
  margin: 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
