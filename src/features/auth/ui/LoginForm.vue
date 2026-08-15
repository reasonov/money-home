<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppField, AppInput, getErrorMessage } from '@/shared'
import { bootstrapAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Введите email и пароль'
    return
  }

  pending.value = true
  try {
    await session.login(email.value, password.value)
    await bootstrapAccountSession()
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось войти')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Почта" for-id="login-email">
      <AppInput
        id="login-email"
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="you@family.ru"
        required
      />
    </AppField>
    <AppField label="Пароль" for-id="login-password">
      <AppInput
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Входим…' : 'Войти' }}
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
