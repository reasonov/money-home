<script setup lang="ts">
import { computed, ref } from 'vue'
import { EllipsisVertical } from '@lucide/vue'
import { NDropdown, type DropdownOption } from 'naive-ui'
import {
  AppButton,
  AppDrawer,
  AppEmpty,
  AppSegmented,
  confirmAction,
  formatMoney,
  getErrorMessage,
  showToast,
} from '@/shared'
import { CategoryIcon, useCategoryStore, type CategoryKind } from '@/entities/category'
import {
  TemplateForm,
  useOperationTemplateStore,
  type OperationTemplate,
} from '@/entities/operation-template'

const templates = useOperationTemplateStore()
const categories = useCategoryStore()

const kind = ref<CategoryKind>('expense')
const drawerOpen = ref(false)
const editing = ref<OperationTemplate | null>(null)

const kindOptions: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const visible = computed(() => templates.forKind(kind.value))

const emptyText = computed(() =>
  kind.value === 'income' ? 'Нет избранного для доходов' : 'Нет избранного для расходов',
)

const menuOptions: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

function label(item: OperationTemplate) {
  return item.title || categories.getById(item.categoryId)?.name || 'Шаблон'
}

function category(item: OperationTemplate) {
  return categories.getById(item.categoryId)
}

function openCreate() {
  editing.value = null
  drawerOpen.value = true
}

function openEdit(item: OperationTemplate) {
  editing.value = item
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editing.value = null
}

function onSaved() {
  showToast(editing.value ? 'Избранное сохранено' : 'Добавлено в избранное')
  closeDrawer()
}

async function remove(item: OperationTemplate) {
  const ok = await confirmAction({
    title: 'Удалить из избранного?',
    message: `«${label(item)}» больше не будет подставляться в форму.`,
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) return
  try {
    await templates.remove(item.id)
    if (editing.value?.id === item.id) {
      closeDrawer()
    }
    showToast('Удалено из избранного')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось удалить избранное'))
  }
}

function onMenu(item: OperationTemplate, key: string | number) {
  if (key === 'edit') {
    openEdit(item)
    return
  }
  if (key === 'remove') {
    void remove(item)
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <AppSegmented v-model="kind" :options="kindOptions" aria-label="Тип избранного" />
      <AppButton variant="secondary" block @click="openCreate">Новый шаблон</AppButton>
    </div>

    <AppEmpty v-if="!visible.length" :description="emptyText" />

    <section v-else class="card">
      <div v-for="item in visible" :key="item.id" class="row">
        <button type="button" class="row__main" @click="openEdit(item)">
          <CategoryIcon
            v-if="category(item)"
            :icon="category(item)!.icon"
            :color="category(item)!.color"
            :size="32"
          />
          <span class="row__body">
            <span class="row__name">{{ label(item) }}</span>
            <span v-if="item.title && category(item)" class="row__meta">{{ category(item)!.name }}</span>
          </span>
          <span class="row__amount">{{ formatMoney(item.amount) }}</span>
        </button>
        <NDropdown
          trigger="click"
          placement="bottom-end"
          :options="menuOptions"
          @select="(key) => onMenu(item, key)"
        >
          <button type="button" class="row__more" aria-label="Ещё действия">
            <EllipsisVertical :size="16" :stroke-width="2" />
          </button>
        </NDropdown>
      </div>
    </section>

    <AppDrawer
      v-model:open="drawerOpen"
      :title="editing ? 'Изменить шаблон' : 'Новый шаблон'"
      height="90%"
    >
      <TemplateForm
        v-if="drawerOpen"
        :template="editing"
        :initial-kind="kind"
        @saved="onSaved"
        @cancel="closeDrawer"
      />
    </AppDrawer>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.toolbar {
  position: sticky;
  top: calc(var(--header-height) + env(safe-area-inset-top, 0px));
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-1);
  background: var(--color-bg);
}

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 56px;
  border-top: 1px solid var(--color-border);
}

.row:first-of-type {
  border-top: 0;
}

.row__main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.row__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.row__name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__amount {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.row__more {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.row__more:hover {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>
