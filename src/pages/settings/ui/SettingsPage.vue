<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppButton, confirmAction, getErrorMessage, showToast } from '@/shared'
import { ChangePasswordForm } from '@/features/auth'
import { EditAccountForm } from '@/features/edit-account'
import { replayProductTour } from '@/features/product-tour'
import { ThemeSwitch } from '@/features/theme-switch'
import { resetAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

function replay() {
  replayProductTour()
  void router.push({ name: 'home' })
}

async function logout() {
  const ok = await confirmAction({
    title: 'Выйти из аккаунта?',
    message: 'Вы сможете войти снова с тем же email и паролем.',
    confirmLabel: 'Выйти',
    danger: true,
  })
  if (!ok) {
    return
  }
  try {
    await session.logout()
    resetAccountSession()
    void router.push('/login')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось выйти'))
  }
}
</script>

<template>
  <div class="settings">
    <section class="settings__block">
      <h2 class="settings__heading">Оформление</h2>
      <p class="settings__hint">Тема приложения</p>
      <div data-tour="settings-theme">
        <ThemeSwitch />
      </div>

      <h2 class="settings__heading settings__heading--spaced">Подсказки</h2>
      <p class="settings__hint">Короткий гайд по счетам, категориям и планированию</p>
      <AppButton variant="secondary" block @click="replay">Показать подсказки</AppButton>
    </section>

    <section class="settings__block">
      <h2 class="settings__heading">Профиль</h2>
      <EditAccountForm />
      <p class="settings__email">{{ session.user?.email }}</p>
      <ChangePasswordForm />
      <AppButton variant="danger" block @click="logout">Выйти</AppButton>
    </section>
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

.settings__email {
  color: var(--color-text-muted);
}

.settings__hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
