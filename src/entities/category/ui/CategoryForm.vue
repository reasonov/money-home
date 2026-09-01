<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppButton, AppField, AppInput, AppSelect, confirmAction, getErrorMessage } from '@/shared'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryIconKey,
  type CategoryKind,
} from '../model/types'
import { familyByBase, familyPalette } from '../lib/colorFamilies'
import { matchCategoryIcon } from '../lib/matchIcon'
import { useCategoryStore } from '../model/store'
import CategoryIconPicker from './CategoryIconPicker.vue'

const props = defineProps<{
  category?: Category | null
  lockedKind?: CategoryKind
  initialKind?: CategoryKind
  initialGroupId?: string
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
const iconTouched = ref(false)
const groupId = ref('')
const selected = ref<string[]>(props.accounts.map((item) => item.id))
const colorManual = ref(false)
const error = ref('')
const pending = ref(false)

const editingId = computed(() => props.category?.id ?? null)
const grouped = computed(() => Boolean(groupId.value))

const groupOptions = computed(() =>
  categories.groups
    .filter((item) => item.kind === kind.value)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
)

const palette = computed(() => {
  if (!groupId.value) return CATEGORY_COLORS
  const group = categories.getGroupById(groupId.value)
  if (!group) return CATEGORY_COLORS
  return familyPalette(group.color, 'light')
})

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

function sameAccountSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const set = new Set(left)
  return right.every((id) => set.has(id))
}

function applyCategory(category: Category | null | undefined) {
  if (category) {
    iconTouched.value = true
    kind.value = props.lockedKind ?? category.kind
    name.value = capitalizeName(category.name)
    color.value = category.color
    icon.value = (CATEGORY_ICONS as readonly string[]).includes(category.icon)
      ? (category.icon as CategoryIconKey)
      : 'other'
    groupId.value = category.groupId ?? ''
    colorManual.value = category.colorManual
    selected.value = category.accountIds.filter((id) =>
      props.accounts.some((account) => account.id === id),
    )
    error.value = ''
    return
  }
  iconTouched.value = false
  kind.value = props.lockedKind ?? props.initialKind ?? 'expense'
  name.value = ''
  icon.value = 'other'
  groupId.value = props.initialGroupId ?? ''
  colorManual.value = false
  selected.value = props.accounts.map((item) => item.id)
  color.value = groupId.value ? categories.autoShadeForGroup(groupId.value) : CATEGORY_COLORS[0]
  error.value = ''
}

const iconModel = computed({
  get: () => icon.value,
  set: (value: CategoryIconKey) => {
    iconTouched.value = true
    icon.value = value
  },
})

watch(name, (value) => {
  if (iconTouched.value) return
  const matched = matchCategoryIcon(value)
  if (matched) icon.value = matched
})

watch(
  () => [props.category, props.lockedKind, props.initialKind, props.initialGroupId] as const,
  () => {
    applyCategory(props.category)
  },
  { immediate: true },
)

watch(kind, (value) => {
  const group = groupId.value ? categories.getGroupById(groupId.value) : undefined
  if (group && group.kind !== value) {
    groupId.value = ''
  }
})

watch(groupId, (next, prev) => {
  if (next === prev) return
  if (next) {
    const group = categories.getGroupById(next)
    if (!group) return
    if (
      !colorManual.value ||
      !familyByBase(group.color)?.light.some((item) => item === color.value)
    ) {
      color.value = categories.autoShadeForGroup(next, editingId.value ?? undefined)
      colorManual.value = false
    }
    return
  }
  if (prev) {
    const group = categories.getGroupById(prev)
    if (group) {
      selected.value = group.accountIds.filter((id) =>
        props.accounts.some((account) => account.id === id),
      )
    }
  }
  if (!CATEGORY_COLORS.includes(color.value as (typeof CATEGORY_COLORS)[number])) {
    color.value = CATEGORY_COLORS[0]
  }
  colorManual.value = false
})

function pickColor(item: string) {
  color.value = item
  const group = groupId.value ? categories.getGroupById(groupId.value) : undefined
  colorManual.value = group ? !familyPalette(group.color).includes(item) : false
}

async function onSubmit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Укажите название'
    return
  }
  if (!grouped.value && !selected.value.length) {
    error.value = 'Укажите название и хотя бы один счёт'
    return
  }

  const nextGroup = groupId.value ? categories.getGroupById(groupId.value) : undefined
  const previous = props.category
  if (nextGroup && previous && previous.groupId !== nextGroup.id) {
    if (!sameAccountSet(previous.accountIds, nextGroup.accountIds)) {
      const ok = await confirmAction({
        title: 'Перенести в группу?',
        message:
          'Категория потеряет свои счета и станет видна на счетах группы. История операций не изменится.',
        confirmLabel: 'Перенести',
      })
      if (!ok) return
    }
  }

  pending.value = true
  try {
    const saved = await categories.save({
      id: editingId.value ?? undefined,
      kind: kind.value,
      name: name.value,
      color: color.value,
      icon: icon.value,
      accountIds: grouped.value ? (nextGroup?.accountIds ?? []) : selected.value,
      groupId: groupId.value || null,
      colorManual: colorManual.value,
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
    <AppField v-if="!lockedKind" label="Тип" for-id="cat-kind" required>
      <AppSelect id="cat-kind" v-model="kind">
        <option value="expense">Расход</option>
        <option value="income">Доход</option>
      </AppSelect>
    </AppField>
    <AppField label="Название" for-id="cat-name" required>
      <AppInput id="cat-name" v-model="nameModel" required />
    </AppField>
    <AppField label="Группа" for-id="cat-group">
      <AppSelect id="cat-group" v-model="groupId">
        <option value="">Без группы</option>
        <option v-for="group in groupOptions" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </AppSelect>
    </AppField>
    <fieldset class="palette">
      <legend>Цвет</legend>
      <button
        v-for="item in palette"
        :key="item"
        type="button"
        class="swatch"
        :class="{ 'is-on': color === item }"
        :style="{ background: item }"
        :aria-label="item"
        @click="pickColor(item)"
      />
    </fieldset>
    <CategoryIconPicker v-model="iconModel" :color="color" />
    <AppField
      v-if="!grouped && accounts.length"
      label="Счета"
      for-id="cat-accounts"
      required
      help="Категория видна только на выбранных счетах. При создании по умолчанию — все текущие."
    >
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
    <p v-else-if="grouped" class="hint">Счета наследуются от группы.</p>
    <p v-else class="hint">Сначала создайте счёт — категория привязывается к счетам.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions">
      <AppButton type="submit" block :disabled="pending || (!grouped && !accounts.length)">
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
