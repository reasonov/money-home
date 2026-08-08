<script setup lang="ts">
import { ref, watch } from 'vue'
import { AppButton, AppField, AppInput, getErrorMessage, showToast } from '@/shared'
import { useBalanceStore } from '@/entities/balance'
import { useSessionStore } from '@/entities/session'

const emit = defineEmits<{
  saved: []
}>()

const session = useSessionStore()
const balance = useBalanceStore()
const value = ref(String(balance.amount))
const saved = ref(false)
const error = ref('')
const pending = ref(false)

watch(
  () => balance.amount,
  (amount) => {
    if (!saved.value) {
      value.value = String(amount)
    }
  },
)

async function onSubmit() {
  error.value = ''
  const next = Number(value.value)
  if (!Number.isFinite(next) || next < 0) {
    error.value = 'Укажите корректную сумму'
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }

  pending.value = true
  try {
    await balance.setBalance(next, userId)
    saved.value = true
    showToast('Баланс обновлён')
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить баланс')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Текущий баланс, ₽" for-id="balance-amount">
      <AppInput
        id="balance-amount"
        v-model="value"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Сохраняем…' : 'Сохранить баланс' }}
    </AppButton>
    <p v-if="saved" class="form__ok">Баланс обновлён</p>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__ok {
  color: var(--color-success);
  font-size: 0.875rem;
  font-weight: 600;
}

.form__error {
  color: var(--color-warning);
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
