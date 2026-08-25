<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowUpDown,
  ChevronRight,
  GripVertical,
  List,
  Plus,
  Settings,
  Wallet,
} from '@lucide/vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { RouterLink, useRouter } from 'vue-router'
import {
  APP_VERSION,
  AppDragGhost,
  AppTag,
  applyAccountOrderFromPinned,
  closeSidebar,
  formatMoney,
  NAV_ITEM_BY_ID,
  openFormDrawer,
  resolveSidebarAccounts,
  sidebarOpen,
  sortAccountsByOrder,
  usePointerReorder,
  isNavItemId,
  type NavItemId,
  type SidebarSectionId,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { usePreferencesStore } from '@/entities/preferences'

const router = useRouter()
const accounts = useAccountStore()
const prefs = usePreferencesStore()

const open = computed({
  get: () => sidebarOpen.value,
  set: (value: boolean) => {
    sidebarOpen.value = value
  },
})

const accountReorderMode = ref(false)
const sectionReorderMode = ref(false)
const accountDraft = ref<string[] | null>(null)
const sectionDraft = ref<SidebarSectionId[] | null>(null)
const accountsEl = ref<HTMLElement | null>(null)
const sectionsEl = ref<HTMLElement | null>(null)

const previewAccounts = computed(() => {
  if (accountDraft.value) {
    const byId = new Map(accounts.items.map((account) => [account.id, account]))
    return accountDraft.value.flatMap((id) => {
      const account = byId.get(id)
      return account ? [account] : []
    })
  }
  return resolveSidebarAccounts(accounts.items, prefs.accountOrder, prefs.sidebarAccountIds)
})
const canReorderAccounts = computed(() => previewAccounts.value.length > 1)

const displayedSections = computed(() => sectionDraft.value ?? prefs.sidebarSections)
const sectionItems = computed(() => displayedSections.value.map((id) => NAV_ITEM_BY_ID[id]))

const {
  draggingId: accountDraggingId,
  dragging: accountDragging,
  ghost: accountGhost,
  onPointerDown: onAccountPointerDown,
} = usePointerReorder({
  container: accountsEl,
  getIds: () => previewAccounts.value.map((account) => account.id),
  enabled: () => accountReorderMode.value,
  onReorder(ids) {
    accountDraft.value = ids
  },
  onDragEnd() {
    commitAccountOrder()
  },
})

const {
  draggingId: sectionDraggingId,
  dragging: sectionDragging,
  ghost: sectionGhost,
  onPointerDown: onSectionPointerDown,
} = usePointerReorder({
  container: sectionsEl,
  getIds: () => displayedSections.value,
  enabled: () => sectionReorderMode.value,
  onReorder(ids) {
    sectionDraft.value = ids as SidebarSectionId[]
  },
  onDragEnd() {
    commitSectionOrder()
  },
})

const dragGhost = computed(() => accountGhost.value ?? sectionGhost.value)
const draggedAccount = computed(() => previewAccounts.value.find((account) => account.id === accountDraggingId.value))
const draggedSection = computed(() => {
  const id = sectionDraggingId.value
  return id && isNavItemId(id) ? NAV_ITEM_BY_ID[id] : null
})

function orderedAccountIds() {
  return sortAccountsByOrder(accounts.items, prefs.accountOrder).map((account) => account.id)
}

function commitAccountOrder() {
  if (!accountDraft.value) {
    return
  }
  prefs.setAccountOrder(applyAccountOrderFromPinned(orderedAccountIds(), accountDraft.value))
  accountDraft.value = null
}

function commitSectionOrder() {
  if (!sectionDraft.value) {
    return
  }
  prefs.setSidebarSections(sectionDraft.value)
  sectionDraft.value = null
}

function go(path: string) {
  closeSidebar()
  void router.push(path)
}

function openTransfer() {
  closeSidebar()
  openFormDrawer({ name: 'transfer' })
}

function activateSection(id: NavItemId) {
  if (sectionReorderMode.value) {
    return
  }
  const item = NAV_ITEM_BY_ID[id]
  if (item.action === 'transfer') {
    openTransfer()
    return
  }
  if (item.to) {
    go(item.to)
  }
}

function openAccountCreate() {
  closeSidebar()
  openFormDrawer({ name: 'account' })
}

function openAccount(id: string) {
  if (accountReorderMode.value) {
    return
  }
  closeSidebar()
  void router.push({ name: 'account-detail', params: { id } })
}

function toggleAccountReorder() {
  if (accountReorderMode.value) {
    commitAccountOrder()
    accountReorderMode.value = false
    return
  }
  commitSectionOrder()
  sectionReorderMode.value = false
  accountReorderMode.value = true
}

function toggleSectionReorder() {
  if (sectionReorderMode.value) {
    commitSectionOrder()
    sectionReorderMode.value = false
    return
  }
  commitAccountOrder()
  accountReorderMode.value = false
  sectionReorderMode.value = true
}

watch(open, (isOpen) => {
  if (isOpen) {
    return
  }
  commitAccountOrder()
  commitSectionOrder()
  accountReorderMode.value = false
  sectionReorderMode.value = false
})
</script>

<template>
  <NDrawer
    v-model:show="open"
    placement="left"
    :width="300"
    :auto-focus="false"
    :trap-focus="true"
    :z-index="2000000000"
  >
    <NDrawerContent
      closable
      :native-scrollbar="false"
      :header-style="{
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingBottom: '8px',
      }"
    >
      <template #header>
        <p class="sidebar__brand">
          <span>Money Home</span>
          <span class="sidebar__version">{{ APP_VERSION }}</span>
        </p>
      </template>
      <nav class="sidebar" aria-label="Разделы">
        <section class="sidebar__block">
          <div class="sidebar__heading-row">
            <h2 class="sidebar__heading">Счета</h2>
            <button
              v-if="canReorderAccounts"
              type="button"
              class="sidebar__reorder"
              :aria-pressed="accountReorderMode"
              :aria-label="accountReorderMode ? 'Завершить изменение порядка' : 'Изменить порядок счетов'"
              @click="toggleAccountReorder"
            >
              <ArrowUpDown :size="18" :stroke-width="1.8" />
            </button>
          </div>
          <p v-if="!accounts.items.length" class="sidebar__empty">Пока нет счетов</p>
          <div
            ref="accountsEl"
            class="sidebar__accounts"
            :class="{ 'has-items': previewAccounts.length }"
          >
            <button
              v-for="account in previewAccounts"
              :key="account.id"
              class="sidebar__account"
              :class="{ 'is-lifted': accountDragging && accountDraggingId === account.id }"
              type="button"
              :data-reorder-id="account.id"
              :aria-label="`Открыть счёт «${account.name}»`"
              @click="openAccount(account.id)"
              @pointerdown="accountReorderMode ? onAccountPointerDown(account.id, $event) : undefined"
            >
              <span v-if="accountReorderMode" class="sidebar__grip" aria-hidden="true">
                <GripVertical :size="16" :stroke-width="2" />
              </span>
              <span class="sidebar__icon" aria-hidden="true">
                <Wallet :size="18" :stroke-width="1.8" />
              </span>
              <span class="sidebar__account-body">
                <span class="sidebar__account-name">
                  <span class="sidebar__account-title">{{ account.name }}</span>
                  <AppTag v-if="accounts.isShared(account.id)" type="primary">Общий счёт</AppTag>
                </span>
                <span class="sidebar__account-amount">{{ formatMoney(account.amount) }}</span>
              </span>
              <span v-if="!accountReorderMode" class="sidebar__chevron" aria-hidden="true">
                <ChevronRight :size="18" :stroke-width="1.8" />
              </span>
            </button>
          </div>
          <RouterLink class="sidebar__link" to="/accounts" @click="closeSidebar">
            <span class="sidebar__icon" aria-hidden="true">
              <List :size="18" :stroke-width="1.8" />
            </span>
            Все счета
          </RouterLink>
          <button class="sidebar__link" type="button" @click="openAccountCreate">
            <span class="sidebar__icon" aria-hidden="true">
              <Plus :size="18" :stroke-width="1.8" />
            </span>
            Добавить счёт
          </button>
        </section>

        <section class="sidebar__block">
          <div class="sidebar__heading-row">
            <h2 class="sidebar__heading">Разделы</h2>
            <button
              type="button"
              class="sidebar__reorder"
              :aria-pressed="sectionReorderMode"
              :aria-label="sectionReorderMode ? 'Завершить изменение порядка' : 'Изменить порядок разделов'"
              @click="toggleSectionReorder"
            >
              <ArrowUpDown :size="18" :stroke-width="1.8" />
            </button>
          </div>
          <div ref="sectionsEl">
            <button
              v-for="item in sectionItems"
              :key="item.id"
              class="sidebar__link"
              :class="{ 'is-lifted': sectionDragging && sectionDraggingId === item.id }"
              type="button"
              :data-reorder-id="item.id"
              @click="activateSection(item.id)"
              @pointerdown="sectionReorderMode ? onSectionPointerDown(item.id, $event) : undefined"
            >
              <span v-if="sectionReorderMode" class="sidebar__grip" aria-hidden="true">
                <GripVertical :size="16" :stroke-width="2" />
              </span>
              <span class="sidebar__icon" aria-hidden="true">
                <component :is="item.icon" :size="18" :stroke-width="1.8" />
              </span>
              {{ item.sidebarLabel ?? item.label }}
            </button>
          </div>
        </section>

        <section class="sidebar__block">
          <button class="sidebar__link" type="button" @click="go('/settings')">
            <span class="sidebar__icon" aria-hidden="true">
              <Settings :size="18" :stroke-width="1.8" />
            </span>
            Настройки
          </button>
        </section>
      </nav>
    </NDrawerContent>
  </NDrawer>
  <AppDragGhost :ghost="dragGhost">
    <template v-if="draggedAccount">
      <span class="drag-ghost__icon" aria-hidden="true">
        <Wallet :size="18" :stroke-width="1.8" />
      </span>
      <span class="drag-ghost__label">{{ draggedAccount.name }}</span>
    </template>
    <template v-else-if="draggedSection">
      <span class="drag-ghost__icon" aria-hidden="true">
        <component :is="draggedSection.icon" :size="18" :stroke-width="1.8" />
      </span>
      <span class="drag-ghost__label">{{ draggedSection.sidebarLabel ?? draggedSection.label }}</span>
    </template>
  </AppDragGhost>
</template>

<style scoped>
:deep(.n-drawer-header) {
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
}

.sidebar__brand {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.sidebar__version {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--color-text-muted);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.sidebar__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.sidebar__heading-row .sidebar__heading {
  margin-bottom: 0;
}

.sidebar__heading {
  margin-bottom: var(--space-2);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.sidebar__reorder {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -10px -8px -10px 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.sidebar__reorder[aria-pressed='true'] {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.sidebar__empty {
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.sidebar__account,
.sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.sidebar__account.is-lifted,
.sidebar__link.is-lifted {
  opacity: 0.28;
}

.sidebar__account + .sidebar__account,
.sidebar__link + .sidebar__link,
.sidebar__accounts.has-items + .sidebar__link {
  border-top: 1px solid var(--color-border);
}

.sidebar__account-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sidebar__account-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.sidebar__account-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__account-name :deep(.n-tag) {
  flex-shrink: 0;
}

.sidebar__account-amount {
  flex-shrink: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.sidebar__chevron {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
}

.sidebar__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.sidebar__grip {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-left: -4px;
  color: var(--color-text-muted);
  touch-action: none;
  cursor: grab;
}

.sidebar__link:hover {
  text-decoration: none;
}
</style>
