<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  FolderTree,
  House,
  List,
  PieChart,
  Plus,
  Settings,
  Wallet,
} from '@lucide/vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { RouterLink, useRouter } from 'vue-router'
import { APP_VERSION, AppTag, closeSidebar, formatMoney, openFormDrawer, sidebarOpen } from '@/shared'
import { useAccountStore } from '@/entities/account'

const router = useRouter()
const accounts = useAccountStore()

const open = computed({
  get: () => sidebarOpen.value,
  set: (value: boolean) => {
    sidebarOpen.value = value
  },
})

const previewAccounts = computed(() => accounts.items.slice(0, 3))

const links = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/stats', label: 'Статистика', icon: PieChart },
  { to: '/calendar', label: 'Планирование', icon: CalendarCheck },
  { to: '/categories', label: 'Категории', icon: FolderTree },
  { to: '/income', label: 'Регулярные операции', icon: CalendarClock },
]

function go(path: string) {
  closeSidebar()
  void router.push(path)
}

function openTransfer() {
  closeSidebar()
  openFormDrawer({ name: 'transfer' })
}

function openAccountCreate() {
  closeSidebar()
  openFormDrawer({ name: 'account' })
}

function openAccount(id: string) {
  closeSidebar()
  void router.push({ name: 'account-detail', params: { id } })
}
</script>

<template>
  <NDrawer
    v-model:show="open"
    placement="left"
    :width="300"
    :auto-focus="true"
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
          <h2 class="sidebar__heading">Счета</h2>
          <p v-if="!accounts.items.length" class="sidebar__empty">Пока нет счетов</p>
          <button
            v-for="account in previewAccounts"
            :key="account.id"
            class="sidebar__account"
            type="button"
            :aria-label="`Открыть счёт «${account.name}»`"
            @click="openAccount(account.id)"
          >
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
            <span class="sidebar__chevron" aria-hidden="true">
              <ChevronRight :size="18" :stroke-width="1.8" />
            </span>
          </button>
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
          <h2 class="sidebar__heading">Разделы</h2>
          <button
            v-for="link in links"
            :key="link.to"
            class="sidebar__link"
            type="button"
            @click="go(link.to)"
          >
            <span class="sidebar__icon" aria-hidden="true">
              <component :is="link.icon" :size="18" :stroke-width="1.8" />
            </span>
            {{ link.label }}
          </button>
          <button class="sidebar__link" type="button" @click="openTransfer">
            <span class="sidebar__icon" aria-hidden="true">
              <ArrowLeftRight :size="18" :stroke-width="1.8" />
            </span>
            Перевод между счетами
          </button>
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

.sidebar__heading {
  margin-bottom: var(--space-2);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
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

.sidebar__account + .sidebar__account,
.sidebar__link + .sidebar__link,
.sidebar__account + .sidebar__link {
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

.sidebar__link:hover {
  text-decoration: none;
}
</style>
