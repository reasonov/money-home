<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppButton, confirmAction, getErrorMessage, showToast } from '@/shared'
import { ChangePasswordForm } from '@/features/auth'
import { EditAccountForm } from '@/features/edit-account'
import { resetAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

async function logout() {
  const ok = await confirmAction({
    title: 'Выйти из аккаунта?',
    message: 'Вы сможете войти снова с той же почтой и паролем.',
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
  <div class="profile">
    <section class="profile__block">
      <EditAccountForm />
      <p class="profile__email">{{ session.user?.email }}</p>
      <ChangePasswordForm />
      <AppButton variant="danger" block @click="logout">Выйти</AppButton>
    </section>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.profile__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.profile__email {
  color: var(--color-text-muted);
}
</style>
