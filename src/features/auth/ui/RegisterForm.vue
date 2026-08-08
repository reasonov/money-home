<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppField, AppInput, getErrorMessage } from '@/shared'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  if (!email.value.trim() || password.value.length < 6) {
    error.value = 'Email и пароль от 6 символов'
    return
  }

  pending.value = true
  try {
    await session.register(email.value, password.value)
    await router.push('/onboarding')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось создать аккаунт')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Почта" for-id="register-email">
      <AppInput
        id="register-email"
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="you@family.ru"
        required
      />
    </AppField>
    <AppField label="Пароль" for-id="register-password" hint="Минимум 6 символов">
      <AppInput
        id="register-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Создаём…' : 'Создать аккаунт' }}
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
