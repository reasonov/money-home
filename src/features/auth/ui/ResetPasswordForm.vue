<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppField, AppInput, getErrorMessage, showToast } from '@/shared'
import { bootstrapAccountSession } from '@/entities/account'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

const password = ref('')
const confirm = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Пароль должен быть не короче 6 символов'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Пароли не совпадают'
    return
  }
  pending.value = true
  try {
    await session.updatePassword(password.value)
    await bootstrapAccountSession()
    showToast('Пароль обновлён')
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить пароль')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Новый пароль" for-id="reset-password" hint="Минимум 6 символов">
      <AppInput
        id="reset-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      />
    </AppField>
    <AppField label="Ещё раз" for-id="reset-confirm">
      <AppInput
        id="reset-confirm"
        v-model="confirm"
        type="password"
        autocomplete="new-password"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Сохраняем…' : 'Сохранить пароль' }}
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
