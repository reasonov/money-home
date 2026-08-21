<script setup lang="ts">
import { ref, watch } from 'vue'
import { AppButton, AppField, AppInput, getErrorMessage, showToast } from '@/shared'
import { updateProfileName } from '@/entities/profile'
import { useSessionStore } from '@/entities/session'

const session = useSessionStore()
const value = ref(session.user?.displayName ?? '')
const error = ref('')
const pending = ref(false)

watch(
  () => session.user?.displayName,
  (name) => {
    if (!pending.value && name) {
      value.value = name
    }
  },
)

async function onSubmit() {
  error.value = ''
  const name = value.value.trim()
  if (!name) {
    error.value = 'Укажите имя'
    return
  }

  pending.value = true
  try {
    await session.updateDisplayName(name)
    if (session.user?.id) {
      await updateProfileName(session.user.id, name)
    }
    showToast('Имя обновлено')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить имя')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Имя" for-id="account-name" required>
      <AppInput
        id="account-name"
        v-model="value"
        type="text"
        autocomplete="name"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Сохраняем…' : 'Сохранить имя' }}
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
