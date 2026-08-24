<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppButton, AppField, AppInput, AppSelect, getErrorMessage } from '@/shared'
import { CATEGORY_COLORS, type CategoryGroup, type CategoryKind } from '../model/types'
import { useCategoryStore } from '../model/store'

const GROUP_ICON = 'other'

const props = defineProps<{
  group?: CategoryGroup | null
  initialKind?: CategoryKind
  accounts: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  saved: [group: CategoryGroup]
  cancel: []
}>()

const categories = useCategoryStore()

const kind = ref<CategoryKind>(props.group?.kind ?? props.initialKind ?? 'expense')
const name = ref('')
const color = ref<string>(CATEGORY_COLORS[0])
const selected = ref<string[]>(props.accounts.map((item) => item.id))
const error = ref('')
const pending = ref(false)

const editingId = computed(() => props.group?.id ?? null)

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

function applyGroup(group: CategoryGroup | null | undefined) {
  if (group) {
    kind.value = group.kind
    name.value = capitalizeName(group.name)
    color.value = group.color
    selected.value = group.accountIds.filter((id) =>
      props.accounts.some((account) => account.id === id),
    )
    error.value = ''
    return
  }
  kind.value = props.initialKind ?? 'expense'
  name.value = ''
  color.value = CATEGORY_COLORS[0]
  selected.value = props.accounts.map((item) => item.id)
  error.value = ''
}

watch(
  () => [props.group, props.initialKind] as const,
  () => {
    applyGroup(props.group)
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
    const saved = await categories.saveGroup({
      id: editingId.value ?? undefined,
      kind: kind.value,
      name: name.value,
      color: color.value,
      icon: GROUP_ICON,
      accountIds: selected.value,
    })
    emit('saved', saved)
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить группу')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <AppField label="Тип" for-id="grp-kind" required>
      <AppSelect id="grp-kind" v-model="kind">
        <option value="expense">Расход</option>
        <option value="income">Доход</option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="grp-name" required>
      <AppInput id="grp-name" v-model="nameModel" required />
    </AppField>
    <fieldset class="palette">
      <legend>Цвет семьи</legend>
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
    <p class="hint">Категории в группе получат оттенки этой семьи.</p>
    <AppField
      v-if="accounts.length"
      label="Счета"
      for-id="grp-accounts"
      required
      help="Группа и все её категории видны на выбранных счетах."
    >
      <AppSelect
        id="grp-accounts"
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
    <p v-else class="hint">Сначала создайте счёт — группа привязывается к счетам.</p>
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
