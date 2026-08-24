<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { EllipsisVertical, GripVertical } from '@lucide/vue'
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
  CategoryGroupForm,
  CategoryIcon,
  GroupColorMark,
  splitCategorySections,
  useCategoryStore,
  type Category,
  type CategoryGroup,
  type CategoryKind,
} from '@/entities/category'
import {
  StarterCatalogBanner,
  StarterCatalogDrawer,
  useStarterCatalogOffer,
} from '@/features/apply-starter-categories'

const UNGROUPED = 'ungrouped'

const accounts = useAccountStore()
const categories = useCategoryStore()
const {
  diff: starterDiff,
  catalogEmpty: starterCatalogEmpty,
  showBanner: showStarterBanner,
  showToolbar: showStarterToolbar,
  drawerOpen: starterDrawerOpen,
  pending: starterPending,
  openDrawer: openStarterDrawer,
  dismissBanner: dismissStarterBanner,
  applyKeys: applyStarterKeys,
  applyAllMissing: applyAllStarter,
} = useStarterCatalogOffer()

const kind = ref<CategoryKind>('expense')
const categoryDrawer = ref(false)
const groupDrawer = ref(false)
const editingCategory = ref<Category | null>(null)
const editingGroup = ref<CategoryGroup | null>(null)
const createGroupId = ref<string | undefined>(undefined)
const draggingId = ref<string | null>(null)
const dropTarget = ref<string | null>(null)
const moving = ref(false)
const ghost = ref<{
  name: string
  color: string
  icon: string
  x: number
  y: number
  width: number
} | null>(null)

let dragPointerId: number | null = null
let dragOrigin: { x: number; y: number } | null = null
let dragStarted = false
let skipClick = false
let holdTimer: ReturnType<typeof setTimeout> | undefined
let lastPointer = { x: 0, y: 0 }
let ghostGrab = { x: 40, y: 28 }
let scrollRaf = 0

const kindOptions: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const sections = computed(() =>
  splitCategorySections(categories.items, categories.groups, kind.value),
)

const empty = computed(
  () => !sections.value.grouped.length && !sections.value.ungrouped.length,
)

const emptyText = computed(() =>
  kind.value === 'income' ? 'Нет категорий доходов' : 'Нет категорий расходов',
)

const showUngrouped = computed(
  () => sections.value.ungrouped.length > 0 || Boolean(draggingId.value),
)

const categoryMenu: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

const groupMenu: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  { label: 'Категория в группу', key: 'add' },
  {
    label: 'Распустить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

function categoryCountLabel(count: number) {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return `${count} категорий`
  if (n1 === 1) return `${count} категория`
  if (n1 >= 2 && n1 <= 4) return `${count} категории`
  return `${count} категорий`
}

function sameAccountSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const set = new Set(left)
  return right.every((id) => set.has(id))
}

function openCreateCategory(groupId?: string) {
  editingCategory.value = null
  createGroupId.value = groupId
  categoryDrawer.value = true
}

function openEditCategory(category: Category) {
  if (skipClick) {
    skipClick = false
    return
  }
  editingCategory.value = category
  createGroupId.value = undefined
  categoryDrawer.value = true
}

function openCreateGroup() {
  editingGroup.value = null
  groupDrawer.value = true
}

function openEditGroup(group: CategoryGroup) {
  editingGroup.value = group
  groupDrawer.value = true
}

function closeCategoryDrawer() {
  categoryDrawer.value = false
  editingCategory.value = null
  createGroupId.value = undefined
}

function closeGroupDrawer() {
  groupDrawer.value = false
  editingGroup.value = null
}

function onCategorySaved() {
  showToast(editingCategory.value ? 'Категория сохранена' : 'Категория создана')
  closeCategoryDrawer()
}

function onGroupSaved() {
  showToast(editingGroup.value ? 'Группа сохранена' : 'Группа создана')
  closeGroupDrawer()
}

async function removeCategory(category: Category) {
  const ok = await confirmAction({
    title: 'Удалить категорию?',
    message: `«${category.name}» исчезнет со всех счетов. История операций не изменится.`,
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) return
  try {
    await categories.remove(category.id)
    if (editingCategory.value?.id === category.id) {
      closeCategoryDrawer()
    }
    showToast('Категория удалена')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось удалить категорию'))
  }
}

async function dissolveGroup(group: CategoryGroup) {
  const ok = await confirmAction({
    title: 'Распустить группу?',
    message: `«${group.name}» исчезнет, категории останутся без группы. История операций не изменится.`,
    confirmLabel: 'Распустить',
    danger: true,
  })
  if (!ok) return
  try {
    await categories.removeGroup(group.id)
    if (editingGroup.value?.id === group.id) {
      closeGroupDrawer()
    }
    showToast('Группа распущена')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось распустить группу'))
  }
}

function onCategoryMenu(category: Category, key: string | number) {
  if (key === 'edit') {
    openEditCategory(category)
    return
  }
  if (key === 'remove') {
    void removeCategory(category)
  }
}

function onGroupMenu(group: CategoryGroup, key: string | number) {
  if (key === 'edit') {
    openEditGroup(group)
    return
  }
  if (key === 'add') {
    openCreateCategory(group.id)
    return
  }
  if (key === 'remove') {
    void dissolveGroup(group)
  }
}

function clearHold() {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = undefined
  }
}

function stopScrollLoop() {
  if (!scrollRaf) return
  cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
}

function dropKeyFromPoint(x: number, y: number) {
  const node = document.elementFromPoint(x, y)
  const host = node?.closest('[data-drop]') as HTMLElement | null
  return host?.dataset.drop ?? null
}

function placeGhost(x: number, y: number) {
  if (!ghost.value) return
  ghost.value = {
    ...ghost.value,
    x: x - ghostGrab.x,
    y: y - ghostGrab.y,
  }
}

function edgeScroll() {
  if (!dragStarted) {
    scrollRaf = 0
    return
  }
  const vh = window.innerHeight
  const topZone = 72
  const bottomZone = 96
  const y = lastPointer.y
  let dy = 0
  if (y < topZone) {
    const t = 1 - Math.max(0, y) / topZone
    dy = -Math.round(6 + t * 22)
  } else if (y > vh - bottomZone) {
    const t = 1 - Math.max(0, vh - y) / bottomZone
    dy = Math.round(6 + t * 22)
  }
  if (dy) {
    const max = Math.max(0, document.documentElement.scrollHeight - vh)
    const next = Math.min(max, Math.max(0, window.scrollY + dy))
    if (next !== window.scrollY) {
      window.scrollTo(0, next)
    }
    dropTarget.value = dropKeyFromPoint(lastPointer.x, lastPointer.y)
  }
  scrollRaf = requestAnimationFrame(edgeScroll)
}

function beginDrag(category: Category, event: PointerEvent) {
  const row = (event.target as HTMLElement | null)?.closest('.row') as HTMLElement | null
  const rect = row?.getBoundingClientRect()
  const width = Math.min(rect?.width || 240, window.innerWidth - 32)
  ghostGrab = {
    x: rect ? Math.min(Math.max(16, event.clientX - rect.left), width - 16) : 40,
    y: rect ? Math.min(Math.max(8, event.clientY - rect.top), 48) : 28,
  }
  lastPointer = { x: event.clientX, y: event.clientY }
  ghost.value = {
    name: category.name,
    color: category.color,
    icon: category.icon,
    width,
    x: event.clientX - ghostGrab.x,
    y: event.clientY - ghostGrab.y,
  }
  draggingId.value = category.id
  dropTarget.value = dropKeyFromPoint(event.clientX, event.clientY)
  dragStarted = true
  skipClick = true
  document.body.classList.add('is-category-dragging')
  stopScrollLoop()
  scrollRaf = requestAnimationFrame(edgeScroll)
}

function onDragMove(event: PointerEvent) {
  if (dragPointerId !== event.pointerId || !dragOrigin) return
  const dx = event.clientX - dragOrigin.x
  const dy = event.clientY - dragOrigin.y
  if (!dragStarted) {
    if (Math.hypot(dx, dy) > 10) {
      clearHold()
    }
    return
  }
  event.preventDefault()
  lastPointer = { x: event.clientX, y: event.clientY }
  placeGhost(event.clientX, event.clientY)
  dropTarget.value = dropKeyFromPoint(event.clientX, event.clientY)
}

async function finishDrag() {
  const categoryId = draggingId.value
  const target = dropTarget.value
  draggingId.value = null
  dropTarget.value = null
  ghost.value = null
  stopScrollLoop()
  document.body.classList.remove('is-category-dragging')
  if (!categoryId || !target) return

  const category = categories.getById(categoryId)
  if (!category) return
  const nextGroupId = target === UNGROUPED ? null : target
  const currentGroupId = category.groupId || null
  if (currentGroupId === nextGroupId) return

  const nextGroup = nextGroupId ? categories.getGroupById(nextGroupId) : undefined
  if (nextGroupId && !nextGroup) return
  if (nextGroup && nextGroup.kind !== category.kind) return

  if (nextGroup && !sameAccountSet(category.accountIds, nextGroup.accountIds)) {
    const ok = await confirmAction({
      title: 'Перенести в группу?',
      message:
        'Категория станет видна на счетах группы. История операций не изменится.',
      confirmLabel: 'Перенести',
    })
    if (!ok) return
  }

  moving.value = true
  try {
    await categories.moveToGroup(categoryId, nextGroupId)
    showToast(nextGroup ? `В группе «${nextGroup.name}»` : 'Без группы')
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось переместить категорию'))
  } finally {
    moving.value = false
  }
}

function onDragEnd(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return
  clearHold()
  const started = dragStarted
  dragPointerId = null
  dragOrigin = null
  dragStarted = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
  if (started) {
    void finishDrag()
    return
  }
  ghost.value = null
  stopScrollLoop()
}

function onCategoryPointerDown(category: Category, event: PointerEvent) {
  if (event.button !== 0 || moving.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.row__more')) return
  dragPointerId = event.pointerId
  dragOrigin = { x: event.clientX, y: event.clientY }
  dragStarted = false
  skipClick = false
  const fromGrip = Boolean(target?.closest('.row__grip'))
  window.addEventListener('pointermove', onDragMove, { passive: false })
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
  if (fromGrip) {
    beginDrag(category, event)
    return
  }
  holdTimer = setTimeout(() => {
    if (dragPointerId !== event.pointerId) return
    beginDrag(category, event)
  }, 280)
}

onUnmounted(() => {
  clearHold()
  stopScrollLoop()
  ghost.value = null
  document.body.classList.remove('is-category-dragging')
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
})
</script>

<template>
  <div class="page" :class="{ 'is-dragging': draggingId }">
    <div class="toolbar" data-tour="categories">
      <AppSegmented v-model="kind" :options="kindOptions" aria-label="Тип категорий" />
      <div class="toolbar__actions">
        <AppButton variant="secondary" block @click="openCreateGroup">Новая группа</AppButton>
        <AppButton variant="secondary" block @click="openCreateCategory()">Новая категория</AppButton>
        <button
          v-if="showStarterToolbar && !showStarterBanner"
          type="button"
          class="toolbar__link"
          @click="openStarterDrawer"
        >
          Добавить базовые
        </button>
      </div>
    </div>

    <StarterCatalogBanner
      v-if="showStarterBanner && !draggingId"
      @select="openStarterDrawer"
      @dismiss="dismissStarterBanner"
    />

    <p v-if="draggingId" class="hint">Перетащите в группу или в «Без группы»</p>

    <AppEmpty v-if="empty && !draggingId" :description="emptyText">
      <AppButton
        v-if="starterCatalogEmpty"
        :disabled="starterPending"
        @click="applyAllStarter"
      >
        {{ starterPending ? 'Добавляем…' : 'Добавить базовые категории' }}
      </AppButton>
    </AppEmpty>

    <template v-else>
      <section
        v-for="section in sections.grouped"
        :key="section.group.id"
        class="group"
        :class="{ 'is-drop': dropTarget === section.group.id }"
        :data-drop="section.group.id"
      >
        <div class="group__head">
          <GroupColorMark variant="stripe" :color="section.group.color" />
          <button type="button" class="group__main" @click="openEditGroup(section.group)">
            <span class="group__meta">Группа · {{ categoryCountLabel(section.categories.length) }}</span>
            <span class="group__name">{{ section.group.name }}</span>
          </button>
          <NDropdown
            trigger="click"
            placement="bottom-end"
            :options="groupMenu"
            @select="(key) => onGroupMenu(section.group, key)"
          >
            <button type="button" class="row__more" aria-label="Ещё действия">
              <EllipsisVertical :size="16" :stroke-width="2" />
            </button>
          </NDropdown>
        </div>
        <p v-if="!section.categories.length" class="empty-group">Пока нет категорий</p>
        <div
          v-for="item in section.categories"
          :key="item.id"
          class="row"
          :class="{ 'is-lifted': draggingId === item.id }"
          @pointerdown="onCategoryPointerDown(item, $event)"
        >
          <button
            type="button"
            class="row__grip"
            aria-label="Переместить"
            @click.prevent
          >
            <GripVertical :size="16" :stroke-width="2" />
          </button>
          <button type="button" class="row__main" @click="openEditCategory(item)">
            <CategoryIcon :icon="item.icon" :color="item.color" :size="32" />
            <span class="row__name">{{ item.name }}</span>
          </button>
          <NDropdown
            trigger="click"
            placement="bottom-end"
            :options="categoryMenu"
            @select="(key) => onCategoryMenu(item, key)"
          >
            <button type="button" class="row__more" aria-label="Ещё действия">
              <EllipsisVertical :size="16" :stroke-width="2" />
            </button>
          </NDropdown>
        </div>
      </section>

      <section
        v-if="showUngrouped"
        class="card"
        :class="{ 'is-drop': dropTarget === UNGROUPED }"
        :data-drop="UNGROUPED"
      >
        <h2 class="ungrouped">Без группы</h2>
        <p v-if="!sections.ungrouped.length" class="empty-group">Отпустите, чтобы убрать из группы</p>
        <div
          v-for="item in sections.ungrouped"
          :key="item.id"
          class="row"
          :class="{ 'is-lifted': draggingId === item.id }"
          @pointerdown="onCategoryPointerDown(item, $event)"
        >
          <button
            type="button"
            class="row__grip"
            aria-label="Переместить"
            @click.prevent
          >
            <GripVertical :size="16" :stroke-width="2" />
          </button>
          <button type="button" class="row__main" @click="openEditCategory(item)">
            <CategoryIcon :icon="item.icon" :color="item.color" :size="32" />
            <span class="row__name">{{ item.name }}</span>
          </button>
          <NDropdown
            trigger="click"
            placement="bottom-end"
            :options="categoryMenu"
            @select="(key) => onCategoryMenu(item, key)"
          >
            <button type="button" class="row__more" aria-label="Ещё действия">
              <EllipsisVertical :size="16" :stroke-width="2" />
            </button>
          </NDropdown>
        </div>
      </section>
    </template>

    <AppDrawer
      v-model:open="categoryDrawer"
      :title="editingCategory ? 'Изменить категорию' : 'Новая категория'"
      height="90%"
    >
      <CategoryForm
        v-if="categoryDrawer"
        :category="editingCategory"
        :initial-kind="kind"
        :initial-group-id="createGroupId"
        :accounts="accounts.items"
        @saved="onCategorySaved"
        @cancel="closeCategoryDrawer"
      />
    </AppDrawer>

    <AppDrawer
      v-model:open="groupDrawer"
      :title="editingGroup ? 'Изменить группу' : 'Новая группа'"
      height="90%"
    >
      <CategoryGroupForm
        v-if="groupDrawer"
        :group="editingGroup"
        :initial-kind="kind"
        :accounts="accounts.items"
        @saved="onGroupSaved"
        @cancel="closeGroupDrawer"
      />
    </AppDrawer>

    <StarterCatalogDrawer
      v-model:open="starterDrawerOpen"
      :diff="starterDiff"
      :pending="starterPending"
      @apply="applyStarterKeys"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="ghost"
      class="drag-ghost"
      aria-hidden="true"
      :style="{
        width: `${ghost.width}px`,
        transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
      }"
    >
      <CategoryIcon :icon="ghost.icon" :color="ghost.color" :size="32" />
      <span class="drag-ghost__name">{{ ghost.name }}</span>
    </div>
  </Teleport>
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

.toolbar__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.toolbar__link {
  grid-column: 1 / -1;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.group,
.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  outline: 2px solid transparent;
  outline-offset: 0;
}

.group.is-drop,
.card.is-drop {
  outline-color: var(--color-accent);
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
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
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

.ungrouped {
  margin: 0 0 var(--space-2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.empty-group {
  margin: 0;
  padding: var(--space-2) 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 56px;
  border-top: 1px solid var(--color-border);
  touch-action: pan-y;
}

.row.is-lifted {
  opacity: 0.35;
}

.row__grip {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: grab;
  touch-action: none;
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

.row__more:hover,
.row__grip:hover {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>

<style>
body.is-category-dragging {
  cursor: grabbing;
  user-select: none;
  touch-action: none;
}

.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 12px 28px var(--color-shadow);
  pointer-events: none;
  will-change: transform;
}

.drag-ghost__name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
