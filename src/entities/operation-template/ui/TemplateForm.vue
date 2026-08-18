<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AppButton,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  AppTextarea,
  getErrorMessage,
} from '@/shared'
import { CategorySelect, useCategoryStore, type CategoryKind } from '@/entities/category'
import { useOperationTemplateStore } from '../model/store'
import type { OperationTemplate } from '../model/types'

const props = defineProps<{
  template?: OperationTemplate | null
  initialKind?: CategoryKind
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const store = useOperationTemplateStore()
const categories = useCategoryStore()

const kind = ref<CategoryKind>(props.template?.kind ?? props.initialKind ?? 'expense')
const categoryId = ref(props.template?.categoryId ?? '')
const amount = ref<string | number>(props.template ? props.template.amount : '')
const title = ref(props.template?.title ?? '')
const notes = ref(props.template?.notes ?? '')
const error = ref('')
const pending = ref(false)

const availableCats = computed(() =>
  kind.value === 'income' ? categories.income : categories.expense,
)

watch(
  availableCats,
  (list) => {
    if (!list.some((item) => item.id === categoryId.value)) {
      categoryId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  () => props.template,
  (template) => {
    kind.value = template?.kind ?? props.initialKind ?? 'expense'
    categoryId.value = template?.categoryId ?? ''
    amount.value = template ? template.amount : ''
    title.value = template?.title ?? ''
    notes.value = template?.notes ?? ''
    error.value = ''
  },
)

async function onSubmit() {
  error.value = ''
  const value = Number(amount.value)
  if (!categoryId.value || !Number.isFinite(value) || value <= 0) {
    error.value = 'Выберите категорию и укажите сумму больше 0 ₽'
    return
  }
  pending.value = true
  try {
    await store.save({
      id: props.template?.id,
      kind: kind.value,
      categoryId: categoryId.value,
      amount: value,
      title: title.value,
      notes: notes.value,
    })
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить избранное')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField v-if="!template" label="Тип" for-id="tpl-kind">
      <AppSelect id="tpl-kind" v-model="kind">
        <option value="expense">Расход</option>
        <option value="income">Доход</option>
      </AppSelect>
    </AppField>
    <AppField label="Сумма, ₽" for-id="tpl-amount">
      <AppInputNumber id="tpl-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="Категория" for-id="tpl-cat">
      <CategorySelect id="tpl-cat" v-model="categoryId" :categories="availableCats" required />
    </AppField>
    <AppField label="Название" for-id="tpl-title">
      <AppInput id="tpl-title" v-model="title" :placeholder="kind === 'expense' ? 'Магазин' : 'Зарплата'" />
    </AppField>
    <AppField label="Комментарий" for-id="tpl-notes">
      <AppTextarea id="tpl-notes" v-model="notes" />
    </AppField>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <AppButton type="submit" block :disabled="pending || !availableCats.length">
        {{ pending ? 'Сохраняем…' : template ? 'Сохранить' : 'Добавить' }}
      </AppButton>
      <AppButton type="button" variant="secondary" block @click="emit('cancel')">
        Отмена
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
.form,
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.error {
  font-size: 0.875rem;
  color: var(--color-danger);
}
</style>
