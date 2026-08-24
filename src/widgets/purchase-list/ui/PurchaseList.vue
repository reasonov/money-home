<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AppButton,
  AppInput,
  AppSelect,
  AppTag,
  confirmAction,
  formatMoney,
  formatRelativeDisplayDate,
  getErrorMessage,
  isPastDate,
  openFormDrawer,
  showToast,
  SwipeReveal,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useActivityStore, UnseenPurchaseDot } from '@/entities/activity'
import { PendingDot } from '@/entities/sync'
import { CategoryIcon, splitCategorySections, useCategoryStore } from '@/entities/category'
import { usePurchaseStore, PurchaseNotes, type Purchase } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'

const props = defineProps<{
  focusId?: string
}>()

const emit = defineEmits<{
  focused: []
}>()

const store = usePurchaseStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const session = useSessionStore()
const activity = useActivityStore()
const menuOpenId = ref<string | null>(null)
const menuStyle = ref<Record<string, string>>({})
const swipeOpenId = ref<string | null>(null)
const menuButtons = new Map<string, HTMLElement>()
const query = ref('')
const categoryId = ref('all')
const highlightedId = ref<string | null>(null)
const itemEls = new Map<string, HTMLElement>()

function setItemEl(id: string, el: unknown) {
  if (el instanceof HTMLElement) {
    itemEls.set(id, el)
    return
  }
  itemEls.delete(id)
}

function setMenuButton(id: string, el: unknown) {
  if (el instanceof HTMLElement) {
    menuButtons.set(id, el)
    return
  }
  menuButtons.delete(id)
}

function updateMenuPosition(id: string) {
  const button = menuButtons.get(id)
  if (!button) return
  const rect = button.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    right: `${Math.max(8, window.innerWidth - rect.right)}px`,
  }
}

function onViewportChange() {
  if (!menuOpenId.value) return
  updateMenuPosition(menuOpenId.value)
}

const groups = computed(() => {
  const today = todayLocal()
  const map = new Map<string, Purchase[]>()
  const needle = query.value.trim().toLowerCase()
  const source =
    accounts.selectedAccountId === ALL_ACCOUNTS_ID
      ? store.planned
      : store.planned.filter((item) => item.accountId === accounts.selectedAccountId)
  const filtered = source.filter((item) => {
    if (categoryId.value.startsWith('group:')) {
      const groupId = categoryId.value.slice(6)
      const cat = item.categoryId ? categories.getById(item.categoryId) : undefined
      if (cat?.groupId !== groupId) {
        return false
      }
    } else if (categoryId.value !== 'all' && item.categoryId !== categoryId.value) {
      return false
    }
    if (needle) {
      const haystack = `${item.title} ${item.notes ?? ''} ${item.categoryName ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) {
        return false
      }
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    const aPast = isPastDate(a.plannedDate, today)
    const bPast = isPastDate(b.plannedDate, today)
    if (aPast !== bPast) {
      return aPast ? -1 : 1
    }
    return a.plannedDate.localeCompare(b.plannedDate)
  })

  for (const item of sorted) {
    const list = map.get(item.plannedDate) ?? []
    list.push(item)
    map.set(item.plannedDate, list)
  }

  return [...map.entries()].map(([date, items]) => ({
    date,
    items,
    overdue: isPastDate(date, today),
  }))
})

onMounted(() => {
  activity.consumeShownPurchases()
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  const shown = store.planned
    .filter((item) => activity.hasUnseenForPurchase(item.id))
    .map((item) => item.id)
  activity.rememberShownPurchases(shown)
})

function acknowledge(id: string) {
  activity.markPurchaseSeen(id)
}

function toggleMenu(id: string, event: Event) {
  event.stopPropagation()
  swipeOpenId.value = null
  if (menuOpenId.value === id) {
    menuOpenId.value = null
    return
  }
  menuOpenId.value = id
  void nextTick(() => updateMenuPosition(id))
}

function closeOverlays() {
  menuOpenId.value = null
  swipeOpenId.value = null
}

function setSwipeOpen(id: string, open: boolean) {
  menuOpenId.value = null
  swipeOpenId.value = open ? id : swipeOpenId.value === id ? null : swipeOpenId.value
}

async function markDone(id: string, options?: { confirm?: boolean; event?: Event }) {
  options?.event?.stopPropagation()
  closeOverlays()
  const purchase = store.getById(id)
  if (!purchase || purchase.status !== 'planned') {
    return
  }

  if (options?.confirm !== false) {
    const ok = await confirmAction({
      title: 'Отметить покупку как купленную?',
      message: `Списать ${formatMoney(purchase.amount)} со счёта и перенести «${purchase.title}» в историю.`,
      confirmLabel: 'Списать и завершить',
    })
    if (!ok) {
      return
    }
  }

  acknowledge(id)
  try {
    await store.markDone(id)
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось завершить покупку'))
  }
}

async function cancel(id: string, event?: Event) {
  event?.stopPropagation()
  closeOverlays()
  const purchase = store.getById(id)
  if (!purchase || purchase.status !== 'planned') {
    return
  }

  const ok = await confirmAction({
    title: 'Отменить покупку?',
    message: `«${purchase.title}» исчезнет из плана. Баланс не изменится.`,
    confirmLabel: 'Отменить покупку',
    danger: true,
  })
  if (!ok) {
    return
  }

  const userId = session.user?.id
  if (!userId) {
    return
  }

  acknowledge(id)
  try {
    await store.setCancelled(id, userId)
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось отменить покупку'))
  }
}

function edit(id: string, event?: Event) {
  event?.stopPropagation()
  closeOverlays()
  acknowledge(id)
  openFormDrawer({ name: 'purchase-edit', purchaseId: id })
}

function accountName(accountId: string) {
  return accounts.getById(accountId)?.name ?? 'Счёт'
}

const purchaseFilterSections = computed(() => {
  const visible = categories.items.filter((cat) => {
    if (cat.kind !== 'expense') return false
    if (
      accounts.selectedAccountId !== ALL_ACCOUNTS_ID &&
      !cat.accountIds.includes(accounts.selectedAccountId)
    ) {
      return false
    }
    return true
  })
  const split = splitCategorySections(visible, categories.groups, 'expense')
  const known = new Set(visible.map((item) => item.id))
  const extras: { id: string; name: string }[] = []
  const source =
    accounts.selectedAccountId === ALL_ACCOUNTS_ID
      ? store.planned
      : store.planned.filter((item) => item.accountId === accounts.selectedAccountId)
  for (const item of source) {
    if (!item.categoryId || !item.categoryName || known.has(item.categoryId)) continue
    if (extras.some((row) => row.id === item.categoryId)) continue
    extras.push({ id: item.categoryId, name: item.categoryName })
  }
  return { ...split, extras }
})

const hasFilters = computed(() => categoryId.value !== 'all' || Boolean(query.value.trim()))

async function revealFocused(id: string) {
  query.value = ''
  categoryId.value = 'all'
  highlightedId.value = id
  await nextTick()
  itemEls.get(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  emit('focused')
}

watch(
  () => props.focusId,
  (id) => {
    if (id) {
      void revealFocused(id)
    }
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <section class="list">
    <div class="filters">
      <AppSelect id="purchase-category" v-model="categoryId" size="medium" filterable aria-label="Категория">
        <option value="all">Все категории</option>
        <optgroup
          v-for="section in purchaseFilterSections.grouped"
          :key="section.group.id"
          :label="section.group.name"
        >
          <option :value="`group:${section.group.id}`">Вся группа</option>
          <option v-for="cat in section.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </optgroup>
        <optgroup
          v-if="purchaseFilterSections.ungrouped.length || purchaseFilterSections.extras.length"
          label="Без группы"
        >
          <option v-for="cat in purchaseFilterSections.ungrouped" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
          <option v-for="cat in purchaseFilterSections.extras" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </optgroup>
      </AppSelect>
      <AppInput id="purchase-query" v-model="query" size="medium" placeholder="Поиск" />
    </div>

    <div v-if="groups.length" class="list__groups" @click="closeOverlays">
      <section v-for="group in groups" :key="group.date" class="group">
        <h3 class="group__date" :class="{ 'is-overdue': group.overdue }">
          {{ formatRelativeDisplayDate(group.date) }}
        </h3>
        <ul class="group__items">
          <li v-for="item in group.items" :key="item.id">
            <SwipeReveal
              label="Куплено"
              :open="swipeOpenId === item.id"
              @update:open="setSwipeOpen(item.id, $event)"
              @action="markDone(item.id, { confirm: false })"
            >
              <div
                :ref="(el) => setItemEl(item.id, el)"
                class="item"
                :class="{ 'is-overdue': group.overdue, 'is-focus': highlightedId === item.id }"
                @click="edit(item.id, $event)"
              >
                <div class="item__main">
                  <p class="item__title">
                    <UnseenPurchaseDot :purchase-id="item.id">
                      <PendingDot :entity-id="item.id">
                        {{ item.title }}
                      </PendingDot>
                    </UnseenPurchaseDot>
                  </p>
                  <p class="item__meta-row">
                    <span class="item__account">{{ accountName(item.accountId) }}</span>
                    <AppTag v-if="item.categoryName" type="default">
                      <CategoryIcon
                        v-if="item.categoryIcon && item.categoryColor"
                        :icon="item.categoryIcon"
                        :color="item.categoryColor"
                        :size="16"
                      />
                      {{ item.categoryName }}
                    </AppTag>
                  </p>
                  <PurchaseNotes v-if="item.notes" :notes="item.notes" />
                  <p v-if="group.overdue" class="item__meta">Просрочено</p>
                </div>
                <div class="item__side">
                  <p class="item__amount money money-soft">{{ formatMoney(item.amount) }}</p>
                  <div class="item__actions">
                    <div class="item__menu">
                      <button
                        :ref="(el) => setMenuButton(item.id, el)"
                        type="button"
                        class="item__more"
                        aria-label="Ещё действия"
                        :aria-expanded="menuOpenId === item.id"
                        @click="toggleMenu(item.id, $event)"
                      >
                        ⋯
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeReveal>
          </li>
        </ul>
      </section>
    </div>

    <div v-else class="list__empty">
      <p class="list__empty-text">
        {{ hasFilters ? 'Ничего не найдено' : 'Пока нет запланированных покупок' }}
      </p>
      <div v-if="!hasFilters" class="list__empty-actions">
        <AppButton block @click="openFormDrawer({ name: 'purchase-new' })"
          >Новая покупка</AppButton
        >
        <AppButton variant="secondary" block @click="openFormDrawer({ name: 'income-rule' })">
          Настроить пополнение
        </AppButton>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="menuOpenId" class="item__dropdown" role="menu" :style="menuStyle" @click.stop>
        <button type="button" role="menuitem" @click="markDone(menuOpenId, { event: $event })">
          Отметить как купленную
        </button>
        <button type="button" role="menuitem" @click="edit(menuOpenId, $event)">Изменить</button>
        <button type="button" class="is-muted" role="menuitem" @click="cancel(menuOpenId, $event)">
          Убрать из плана
        </button>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.list__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.group__date {
  margin-bottom: var(--space-3);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.group__date.is-overdue {
  color: var(--color-warning);
  text-transform: none;
}

.group__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
}

.item.is-overdue {
  border-color: color-mix(in srgb, var(--color-warning) 25%, transparent);
  background: var(--color-warning-soft);
}

.item.is-focus {
  border-color: var(--color-accent);
}

.item__main {
  min-width: 0;
  flex: 1;
}

.item__title {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__meta {
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-warning);
}

.item__meta-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.item__account {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__meta-row :deep(.n-tag) {
  flex-shrink: 0;
}

.item__side {
  text-align: right;
  flex-shrink: 0;
}

.item__amount {
  font-weight: 800;
}

.item__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.item__menu {
  position: relative;
}

.item__more {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text);
  cursor: pointer;
}

.list__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.list__empty-text {
  color: var(--color-text-muted);
}

.list__empty-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.money {
  font-variant-numeric: tabular-nums;
}
</style>

<style>
.item__dropdown {
  position: fixed;
  z-index: 40;
  min-width: 140px;
  padding: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 20px var(--color-shadow);
}

.item__dropdown button {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
}

.item__dropdown button.is-muted {
  color: var(--color-text-muted);
}
</style>
