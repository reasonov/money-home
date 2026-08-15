<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppButton, AppField, AppInput, AppSelect, getErrorMessage } from '@/shared'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryIconKey,
  type CategoryKind,
} from '../model/types'
import { useCategoryStore } from '../model/store'
import CategoryIconPicker from './CategoryIconPicker.vue'

const props = defineProps<{
  category?: Category | null
  lockedKind?: CategoryKind
  initialKind?: CategoryKind
  accounts: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  saved: [category: Category]
  cancel: []
}>()

const categories = useCategoryStore()

const kind = ref<CategoryKind>(props.lockedKind ?? props.category?.kind ?? 'expense')
const name = ref('')
const color = ref<string>(CATEGORY_COLORS[0])
const icon = ref<CategoryIconKey>('other')
const selected = ref<string[]>(props.accounts.map((item) => item.id))
const error = ref('')
const pending = ref(false)

const editingId = computed(() => props.category?.id ?? null)

function capitalizeName(value: string) {
  if (!value) return ''
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1)
}

const nameModel = computed({
  get: () => name.value,
  set: (value: string | number) => {
    name.value = capitalizeName(String(value))
  },
})

function applyCategory(category: Category | null | undefined) {
  if (category) {
    kind.value = props.lockedKind ?? category.kind
    name.value = capitalizeName(category.name)
    color.value = category.color
    icon.value = (CATEGORY_ICONS as readonly string[]).includes(category.icon)
      ? (category.icon as CategoryIconKey)
      : 'other'
    selected.value = category.accountIds.filter((id) =>
      props.accounts.some((account) => account.id === id),
    )
    error.value = ''
    return
  }
  kind.value = props.lockedKind ?? props.initialKind ?? 'expense'
  name.value = ''
  color.value = CATEGORY_COLORS[0]
  icon.value = 'other'
  selected.value = props.accounts.map((item) => item.id)
  error.value = ''
}

watch(
  () => [props.category, props.lockedKind, props.initialKind] as const,
  () => {
    applyCategory(props.category)
  },
  { immediate: true },
)

async function onSubmit() {
  error.value = ''
  if (!name.value.trim() || !selected.value.length) {
    error.value = 'Укажите название и хотя бы один счёт'
    return
  }
  pending.value = true
  try {
    const saved = await categories.save({
      id: editingId.value ?? undefined,
      kind: kind.value,
      name: name.value,
      color: color.value,
      icon: icon.value,
      accountIds: selected.value,
    })
    emit('saved', saved)
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить категорию')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField v-if="!lockedKind" label="Тип" for-id="cat-kind">
      <AppSelect id="cat-kind" v-model="kind">
        <option value="expense">Расход</option>
        <option value="income">Доход</option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="cat-name">
      <AppInput id="cat-name" v-model="nameModel" required />
    </AppField>
    <fieldset class="palette">
      <legend>Цвет</legend>
      <button
        v-for="item in CATEGORY_COLORS"
        :key="item"
        type="button"
        class="swatch"
        :class="{ 'is-on': color === item }"
        :style="{ background: item }"
        :aria-label="item"
        @click="color = item"
      />
    </fieldset>
    <CategoryIconPicker v-model="icon" :color="color" />
    <AppField v-if="accounts.length" label="Счета" for-id="cat-accounts">
      <AppSelect
        id="cat-accounts"
        v-model="selected"
        multiple
        filterable
        placeholder="Выберите счета"
      >
        <option v-for="account in accounts" :key="account.id" :value="account.id">
          {{ account.name }}
        </option>
      </AppSelect>
    </AppField>
    <p v-else class="hint">Сначала создайте счёт — категория привязывается к счетам.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <AppButton type="submit" block :disabled="pending || !accounts.length">
        {{ pending ? 'Сохраняем…' : editingId ? 'Сохранить' : 'Добавить' }}
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

.palette {
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.swatch {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 999px;
  cursor: pointer;
}

.swatch.is-on {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.hint,
.error {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-warning);
}
</style>
