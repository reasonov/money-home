<script setup lang="ts">
import { ref } from 'vue'
import { AppButton, AppField, AppInput, getErrorMessage, isBrowserOnline, ONLINE_ONLY_MESSAGE, showToast } from '@/shared'
import { useSessionStore } from '@/entities/session'
import { isWriteBlocked, WRITE_BLOCKED_MESSAGE } from '@/shared/lib/syncBus'

const session = useSessionStore()
const password = ref('')
const confirm = ref('')
const error = ref('')
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  if (!isBrowserOnline() || isWriteBlocked()) {
    error.value = isWriteBlocked() ? WRITE_BLOCKED_MESSAGE : ONLINE_ONLY_MESSAGE
    return
  }
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
    password.value = ''
    confirm.value = ''
    showToast('Пароль обновлён')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить пароль')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Новый пароль" for-id="settings-password" hint="Минимум 6 символов">
      <AppInput
        id="settings-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
      />
    </AppField>
    <AppField label="Подтвердите пароль" for-id="settings-password-confirm">
      <AppInput
        id="settings-password-confirm"
        v-model="confirm"
        type="password"
        autocomplete="new-password"
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton
      type="submit"
      variant="secondary"
      block
      :disabled="pending || !isBrowserOnline() || isWriteBlocked()"
    >
      {{ pending ? 'Сохраняем…' : 'Сменить пароль' }}
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
}
</style>
