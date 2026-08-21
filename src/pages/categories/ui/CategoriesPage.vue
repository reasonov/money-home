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
  getErrorMessage,
  showToast,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import {
  CategoryForm,
  CategoryIcon,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'

const accounts = useAccountStore()
const categories = useCategoryStore()

const kind = ref<CategoryKind>('expense')
const drawerOpen = ref(false)
const editing = ref<Category | null>(null)

const kindOptions: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const visible = computed(() =>
  kind.value === 'income' ? categories.income : categories.expense,
)

const emptyText = computed(() =>
  kind.value === 'income' ? 'Нет категорий доходов' : 'Нет категорий расходов',
)

const menuOptions: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

function openCreate() {
  editing.value = null
  drawerOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editing.value = null
}

function onSaved() {
  showToast(editing.value ? 'Категория сохранена' : 'Категория создана')
  closeDrawer()
}

async function remove(category: Category) {
  const ok = await confirmAction({
    title: 'Удалить категорию?',
    message: `«${category.name}» исчезнет со всех счетов. История операций не изменится.`,
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) return
  try {
    await categories.remove(category.id)
    if (editing.value?.id === category.id) {
      closeDrawer()
    }
    showToast('Категория удалена')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось удалить категорию'))
  }
}

function onMenu(category: Category, key: string | number) {
  if (key === 'edit') {
    openEdit(category)
    return
  }
  if (key === 'remove') {
    void remove(category)
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar" data-tour="categories">
      <AppSegmented v-model="kind" :options="kindOptions" aria-label="Тип категорий" />
      <AppButton variant="secondary" block @click="openCreate">Новая категория</AppButton>
    </div>

    <AppEmpty v-if="!visible.length" :description="emptyText" />

    <section v-else class="card">
      <div v-for="item in visible" :key="item.id" class="row">
        <button type="button" class="row__main" @click="openEdit(item)">
          <CategoryIcon :icon="item.icon" :color="item.color" :size="32" />
          <span class="row__name">{{ item.name }}</span>
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
      :title="editing ? 'Изменить категорию' : 'Новая категория'"
      height="90%"
    >
      <CategoryForm
        v-if="drawerOpen"
        :category="editing"
        :initial-kind="kind"
        :accounts="accounts.items"
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

.row__name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
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
