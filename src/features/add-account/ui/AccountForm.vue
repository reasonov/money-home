<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AppButton,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  getErrorMessage,
  isBrowserOnline,
  ONLINE_ONLY_MESSAGE,
  showToast,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'

const props = withDefaults(
  defineProps<{
    initialMode?: 'create' | 'join'
  }>(),
  { initialMode: 'create' },
)

const emit = defineEmits<{
  saved: []
}>()

const accounts = useAccountStore()
const categories = useCategoryStore()

const mode = ref<'create' | 'join'>(props.initialMode)
const name = ref('')
const opening = ref('0')
const code = ref('')
const selected = ref<string[]>(categories.items.map((item) => item.id))
const error = ref('')
const pending = ref(false)
const joinBlocked = computed(() => mode.value === 'join' && !isBrowserOnline())

watch(
  () => props.initialMode,
  (value) => {
    mode.value = value
  },
)

async function onSubmit() {
  error.value = ''
  pending.value = true
  try {
    if (mode.value === 'join') {
      if (!isBrowserOnline()) {
        error.value = ONLINE_ONLY_MESSAGE
        return
      }
      await accounts.addByCode(code.value)
      showToast('Счёт добавлен')
    } else {
      const amount = Number(opening.value)
      if (!Number.isFinite(amount) || amount < 0) {
        error.value = 'Укажите стартовый баланс от 0 ₽'
        return
      }
      await accounts.addAccount({
        name: name.value,
        openingAmount: amount,
        categoryIds: selected.value,
      })
      showToast('Счёт создан')
    }
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить счёт')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <div class="tabs">
      <button type="button" :class="{ 'is-on': mode === 'create' }" @click="mode = 'create'">
        Создать
      </button>
      <button type="button" :class="{ 'is-on': mode === 'join' }" @click="mode = 'join'">
        Подключиться по коду
      </button>
    </div>

    <template v-if="mode === 'create'">
      <AppField label="Название" for-id="acc-name" required>
        <AppInput id="acc-name" v-model="name" placeholder="Наличные" required />
      </AppField>
      <AppField label="Стартовый баланс, ₽" for-id="acc-open" required>
        <AppInputNumber id="acc-open" v-model="opening" :min="0" placeholder="0" />
      </AppField>
      <AppField v-if="categories.items.length" label="Категории" for-id="acc-cats">
        <AppSelect
          id="acc-cats"
          v-model="selected"
          multiple
          filterable
          clearable
          placeholder="Выберите категории"
        >
          <option v-for="cat in categories.items" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </AppSelect>
      </AppField>
    </template>

    <AppField v-else label="Код счёта" for-id="acc-code" hint="Запросите код у владельца общего счёта" required>
      <AppInput id="acc-code" v-model="code" placeholder="ABCD2345" required :disabled="joinBlocked" />
    </AppField>
    <p v-if="joinBlocked" class="error" role="alert">{{ ONLINE_ONLY_MESSAGE }}</p>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending || joinBlocked">
      {{ pending ? 'Сохраняем…' : mode === 'join' ? 'Подключиться' : 'Создать счёт' }}
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tabs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-2);
}

.tabs button {
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: break-word;
}

.tabs button.is-on {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.error {
  color: var(--color-warning);
}
</style>
