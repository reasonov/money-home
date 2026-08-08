<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, confirmAction, getErrorMessage, showToast } from '@/shared'
import { EditAccountForm } from '@/features/edit-account'
import { EditBalanceForm } from '@/features/edit-balance'
import { ThemeSwitch } from '@/features/theme-switch'
import { resetHouseholdSession, useHouseholdStore } from '@/entities/household'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()
const household = useHouseholdStore()

const members = computed(() =>
  [...household.members].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru')),
)

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
    resetHouseholdSession()
    void router.push('/login')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось выйти'))
  }
}

async function copyInvite() {
  const code = household.inviteCode
  if (!code || !navigator.clipboard) {
    return
  }
  await navigator.clipboard.writeText(code)
  showToast('Скопировано')
}
</script>

<template>
  <div class="settings">
    <section class="settings__block">
      <h2 class="settings__heading">Семья</h2>
      <p class="settings__name">{{ household.household?.name }}</p>
      <div class="settings__members">
        <p class="settings__label">Участники</p>
        <ul class="settings__member-list">
          <li v-for="member in members" :key="member.userId" class="settings__member">
            <span>{{ member.displayName }}</span>
            <span v-if="member.userId === session.user?.id" class="settings__you">вы</span>
          </li>
        </ul>
      </div>
      <div class="settings__invite">
        <div>
          <p class="settings__label">Код приглашения</p>
          <p class="settings__code">{{ household.inviteCode }}</p>
        </div>
        <AppButton variant="secondary" @click="copyInvite">Копировать</AppButton>
      </div>
    </section>

    <section class="settings__block">
      <h2 class="settings__heading">Баланс</h2>
      <EditBalanceForm />
    </section>

    <section class="settings__block">
      <h2 class="settings__heading">Оформление</h2>
      <p class="settings__hint">Тема приложения</p>
      <ThemeSwitch />
    </section>

    <section class="settings__block">
      <h2 class="settings__heading">Разделы</h2>
      <RouterLink class="settings__link" to="/history">История покупок</RouterLink>
      <RouterLink class="settings__link" to="/income">Пополнения</RouterLink>
      <RouterLink class="settings__link" to="/purchases/new">Новая покупка</RouterLink>
    </section>

    <section class="settings__block">
      <h2 class="settings__heading">Аккаунт</h2>
      <EditAccountForm />
      <p class="settings__email">{{ session.user?.email }}</p>
      <AppButton variant="danger" block @click="logout">Выйти</AppButton>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings__block {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.settings__heading {
  margin-bottom: var(--space-3);
  font-size: 1.125rem;
}

.settings__name,
.settings__email {
  margin-bottom: var(--space-3);
  color: var(--color-text-muted);
}

.settings__hint {
  margin-bottom: var(--space-3);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.settings__members {
  margin-bottom: var(--space-4);
}

.settings__member-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.settings__member {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 44px;
  font-weight: 600;
}

.settings__you {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.settings__invite {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.settings__invite > div {
  min-width: 0;
  flex: 1 1 8rem;
}

.settings__label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.settings__code {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
}

.settings__link {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-weight: 700;
  color: var(--color-accent);
  text-decoration: none;
}

.settings__link + .settings__link {
  border-top: 1px solid var(--color-border);
}
</style>
