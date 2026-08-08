<script setup lang="ts">
import { ref, watch } from 'vue'
import { AppButton, AppField, AppInput, getErrorMessage, showToast } from '@/shared'
import { useHouseholdStore } from '@/entities/household'

const household = useHouseholdStore()
const value = ref(household.household?.name ?? '')
const error = ref('')
const pending = ref(false)

watch(
  () => household.household?.name,
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
    error.value = 'Укажите название'
    return
  }

  pending.value = true
  try {
    await household.updateHouseholdName(name)
    showToast('Название обновлено')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить название')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Название" for-id="household-name">
      <AppInput
        id="household-name"
        v-model="value"
        type="text"
        autocomplete="organization"
        required
      />
    </AppField>
    <p v-if="error" class="form__error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending">
      {{ pending ? 'Сохраняем…' : 'Сохранить название' }}
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
