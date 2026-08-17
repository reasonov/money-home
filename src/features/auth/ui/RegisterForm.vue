<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppField, AppInput, getErrorMessage } from '@/shared'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  if (!displayName.value.trim()) {
    error.value = 'Укажите имя'
    return
  }
  if (!email.value.trim()) {
    error.value = 'Введите почту'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Пароль должен содержать минимум 6 символов'
    return
  }

  pending.value = true
  try {
    await session.register(email.value, password.value, displayName.value)
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось создать аккаунт')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Имя" for-id="register-name">
      <AppInput
        id="register-name"
        v-model="displayName"
        type="text"
        autocomplete="name"
        placeholder="Как вас зовут"
        required
      />
    </AppField>
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
