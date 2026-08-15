<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppButton, AppDrawer, AppEmpty, confirmAction, getErrorMessage, showToast } from '@/shared'
import { useAccountStore } from '@/entities/account'
import {
  CategoryForm,
  CategoryIcon,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'
import { useProductTourStore } from '@/features/product-tour'

const accounts = useAccountStore()
const categories = useCategoryStore()
const tour = useProductTourStore()

const drawerOpen = ref(false)
const editing = ref<Category | null>(null)

const tourKind = computed<CategoryKind | undefined>(() => {
  if (tour.stepId === 'category-income') return 'income'
  if (tour.stepId === 'category-expense') return 'expense'
  return undefined
})

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

watch(
  () => tour.stepId,
  (id) => {
    if (id === 'category-expense' || id === 'category-income') {
      if (!drawerOpen.value) {
        openCreate()
      }
    }
  },
  { immediate: true },
)

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
</script>

<template>
  <div class="page">
    <AppEmpty v-if="!categories.items.length" description="Пока нет категорий">
      <AppButton block @click="openCreate">Новая категория</AppButton>
    </AppEmpty>

    <template v-else>
      <section class="card">
        <div v-for="item in categories.items" :key="item.id" class="row">
          <button type="button" class="row__main" @click="openEdit(item)">
            <CategoryIcon :icon="item.icon" :color="item.color" :size="32" />
            <span>
              <span class="row__name">{{ item.name }}</span>
              <span class="row__meta">{{ item.kind === 'income' ? 'Доход' : 'Расход' }}</span>
            </span>
          </button>
          <AppButton variant="ghost" @click="remove(item)">Удалить</AppButton>
        </div>
      </section>

      <AppButton variant="secondary" block @click="openCreate">Новая категория</AppButton>
    </template>

    <AppDrawer
      v-model:open="drawerOpen"
      :title="editing ? 'Изменить категорию' : 'Новая категория'"
      height="90%"
    >
      <CategoryForm
        v-if="drawerOpen"
        :category="editing"
        :accounts="accounts.items"
        :initial-kind="tourKind"
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

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 56px;
  border-top: 1px solid var(--color-border);
}

.row:first-of-type {
  border-top: 0;
}

.row__main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.row__name {
  display: block;
  font-weight: 700;
}

.row__meta {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
</style>
