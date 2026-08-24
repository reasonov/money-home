<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppButton, AppCheckbox, AppDrawer } from '@/shared'
import {
  CategoryIcon,
  GroupColorMark,
  familyPalette,
  type StarterCatalogDiff,
  type StarterDiffGroup,
} from '@/entities/category'

const KIND_LABEL: Record<string, string> = {
  expense: 'Расходы',
  income: 'Доходы',
}

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  diff: StarterCatalogDiff
  pending?: boolean
}>()

const emit = defineEmits<{
  apply: [keys: string[]]
}>()

const selected = ref<string[]>([])

const missingKeys = computed(() =>
  props.diff.groups.flatMap((group) =>
    group.categories.filter((item) => !item.present).map((item) => item.key),
  ),
)

const visibleGroups = computed(() =>
  props.diff.groups.filter((group) => group.categories.length > 0),
)

const kindSections = computed(() => {
  const order = ['expense', 'income'] as const
  return order
    .map((kind) => ({
      kind,
      label: KIND_LABEL[kind] ?? kind,
      groups: visibleGroups.value.filter((group) => group.kind === kind),
    }))
    .filter((section) => section.groups.length > 0)
})

const selectedSet = computed(() => new Set(selected.value))
const canApply = computed(() => selected.value.length > 0 && !props.pending)
const applyLabel = computed(() => {
  if (props.pending) return 'Добавляем…'
  const count = selected.value.length
  if (!count) return 'Добавить'
  return `Добавить · ${count}`
})

function resetSelection() {
  selected.value = [...missingKeys.value]
}

watch(open, (next) => {
  if (next) resetSelection()
})

function isChecked(key: string) {
  return selectedSet.value.has(key)
}

function toggle(key: string, value: boolean) {
  if (value) {
    if (selectedSet.value.has(key)) return
    selected.value = [...selected.value, key]
    return
  }
  selected.value = selected.value.filter((item) => item !== key)
}

function groupMissing(group: StarterDiffGroup) {
  return group.categories.filter((item) => !item.present)
}

function groupChecked(group: StarterDiffGroup) {
  const keys = groupMissing(group).map((item) => item.key)
  return keys.length > 0 && keys.every((key) => selectedSet.value.has(key))
}

function toggleGroup(group: StarterDiffGroup, value: boolean) {
  const keys = groupMissing(group).map((item) => item.key)
  const next = new Set(selected.value)
  for (const key of keys) {
    if (value) next.add(key)
    else next.delete(key)
  }
  selected.value = [...next]
}

function previewColor(group: StarterDiffGroup, index: number) {
  const palette = familyPalette(group.color)
  return palette[index % palette.length] ?? group.color
}

function missingCountLabel(group: StarterDiffGroup) {
  const total = group.categories.length
  const missing = groupMissing(group).length
  if (missing === total) {
    const n1 = Math.abs(total) % 10
    const n = Math.abs(total) % 100
    if (n > 10 && n < 20) return `${total} категорий`
    if (n1 === 1) return `${total} категория`
    if (n1 >= 2 && n1 <= 4) return `${total} категории`
    return `${total} категорий`
  }
  return `${missing} из ${total}`
}

function onRowClick(key: string, present: boolean) {
  if (present) return
  toggle(key, !isChecked(key))
}

function onApply() {
  if (!canApply.value) return
  emit('apply', selected.value)
}
</script>

<template>
  <AppDrawer v-model:open="open" title="Базовые категории" height="90%">
    <div class="sheet">
      <p class="lead">Выберите, что добавить. Совпадения по имени пропускаются.</p>
      <section v-for="section in kindSections" :key="section.kind" class="kind">
        <h3 class="kind__title">{{ section.label }}</h3>
        <div v-for="group in section.groups" :key="group.key" class="group">
          <div class="group__head">
            <GroupColorMark variant="stripe" :color="group.color" />
            <div class="group__main">
              <span class="group__meta">{{ missingCountLabel(group) }}</span>
              <span class="group__name">{{ group.name }}</span>
            </div>
            <AppCheckbox
              :model-value="groupChecked(group)"
              :disabled="!groupMissing(group).length"
              :aria-label="`Выбрать группу «${group.name}»`"
              @update:model-value="(value) => toggleGroup(group, Boolean(value))"
            />
          </div>
          <button
            v-for="(item, index) in group.categories"
            :key="item.key"
            type="button"
            class="row"
            :class="{ 'is-present': item.present, 'is-on': !item.present && isChecked(item.key) }"
            :disabled="item.present"
            @click="onRowClick(item.key, item.present)"
          >
            <CategoryIcon :icon="item.icon" :color="previewColor(group, index)" :size="32" />
            <span class="row__name">{{ item.name }}</span>
            <span v-if="item.present" class="row__badge">Уже есть</span>
            <span v-else class="row__check" @click.stop>
              <AppCheckbox
                :model-value="isChecked(item.key)"
                @update:model-value="(value) => toggle(item.key, Boolean(value))"
              />
            </span>
          </button>
        </div>
      </section>
      <div class="actions">
        <AppButton block :disabled="!canApply" @click="onApply">{{ applyLabel }}</AppButton>
        <AppButton type="button" variant="secondary" block @click="open = false">Отмена</AppButton>
      </div>
    </div>
  </AppDrawer>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
}

.lead {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.kind {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.kind__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.group {
  padding: var(--space-4);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.group__head {
  display: flex;
  align-items: stretch;
  gap: var(--space-3);
  min-height: 48px;
  margin-bottom: var(--space-1);
}

.group__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.group__meta {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.group__name {
  overflow: hidden;
  font-size: 1.0625rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: 0;
  border: 0;
  border-top: 1px solid var(--color-border);
  background: transparent;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.row:disabled {
  cursor: default;
}

.row.is-present {
  opacity: 0.55;
}

.row__name {
  flex: 1;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__badge {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  background: var(--color-surface);
}

.row__check {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
}

.actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  background: var(--color-surface);
}
</style>
