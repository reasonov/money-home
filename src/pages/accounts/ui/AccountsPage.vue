<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, GripVertical, Plus, Wallet } from '@lucide/vue'
import { useRouter } from 'vue-router'
import {
  AppButton,
  AppCheckbox,
  AppDragGhost,
  AppEmpty,
  AppTag,
  formatMoney,
  MAX_SIDEBAR_ACCOUNTS,
  openFormDrawer,
  resolvePinnedAccountIds,
  showToast,
  sortAccountsByOrder,
  usePointerReorder,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { usePreferencesStore } from '@/entities/preferences'
import { AccountAvailableHint } from '@/widgets/account-available'

const router = useRouter()
const accounts = useAccountStore()
const prefs = usePreferencesStore()

const orderDraft = ref<string[] | null>(null)
const listEl = ref<HTMLElement | null>(null)

const orderedAccounts = computed(() =>
  sortAccountsByOrder(accounts.items, orderDraft.value ?? prefs.accountOrder),
)
const orderedIds = computed(() => orderedAccounts.value.map((account) => account.id))
const pinnedIds = computed(() => new Set(resolvePinnedAccountIds(orderedIds.value, prefs.sidebarAccountIds)))

const { draggingId, dragging, ghost, onPointerDown } = usePointerReorder({
  container: listEl,
  getIds: () => orderedIds.value,
  onReorder(ids) {
    orderDraft.value = ids
  },
  onDragEnd() {
    if (!orderDraft.value) {
      return
    }
    prefs.setAccountOrder(orderDraft.value)
    orderDraft.value = null
  },
})

const draggedAccount = computed(() => orderedAccounts.value.find((account) => account.id === draggingId.value))

function openAccount(id: string) {
  void router.push({ name: 'account-detail', params: { id } })
}

function isPinned(id: string) {
  return pinnedIds.value.has(id)
}

function setPinned(accountId: string, pinned: boolean) {
  const current = resolvePinnedAccountIds(orderedIds.value, prefs.sidebarAccountIds)
  if (pinned) {
    if (current.includes(accountId)) {
      return
    }
    if (current.length >= MAX_SIDEBAR_ACCOUNTS) {
      showToast('В меню можно закрепить до трёх счетов')
      return
    }
    prefs.setSidebarAccountIds([...current, accountId])
    return
  }
  prefs.setSidebarAccountIds(current.filter((id) => id !== accountId))
}
</script>

<template>
  <AppEmpty v-if="!accounts.items.length" description="Создайте счёт для учёта денег или подключитесь к общему счёту по коду">
    <div class="empty-actions">
      <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
      <AppButton variant="secondary" block @click="openFormDrawer({ name: 'account', mode: 'join' })">
        Подключиться по коду
      </AppButton>
    </div>
  </AppEmpty>

  <div v-else class="page">
    <section class="card">
      <p class="hint">В боковом меню — до трёх счетов. Перетащите, чтобы задать порядок</p>
      <div ref="listEl">
        <div
          v-for="account in orderedAccounts"
          :key="account.id"
          class="row"
          :class="{ 'is-lifted': dragging && draggingId === account.id }"
          :data-reorder-id="account.id"
        >
          <button
            type="button"
            class="row__grip"
            aria-label="Изменить порядок"
            @pointerdown="onPointerDown(account.id, $event)"
            @click.prevent
          >
            <GripVertical :size="16" :stroke-width="2" />
          </button>
          <button
            class="row__main"
            type="button"
            :aria-label="`Открыть счёт «${account.name}»`"
            @click="openAccount(account.id)"
          >
            <span class="row__icon" aria-hidden="true">
              <Wallet :size="18" :stroke-width="1.8" />
            </span>
            <span class="row__body">
              <span class="row__name">
                <span class="row__title">{{ account.name }}</span>
                <AppTag v-if="accounts.isShared(account.id)" type="primary">Общий счёт</AppTag>
                <AppTag v-if="account.excludeFromTotal" type="default">Не в итоге</AppTag>
              </span>
              <span class="row__amount">{{ formatMoney(account.amount) }}</span>
              <AccountAvailableHint compact :account-id="account.id" :balance="account.amount" />
            </span>
            <span class="row__chevron" aria-hidden="true">
              <ChevronRight :size="18" :stroke-width="1.8" />
            </span>
          </button>
          <AppCheckbox
            class="row__pin"
            :checked="isPinned(account.id)"
            :aria-label="`Показывать «${account.name}» в меню`"
            @update:checked="(checked) => setPinned(account.id, checked)"
          >
            В меню
          </AppCheckbox>
        </div>
      </div>
    </section>

    <AppButton variant="secondary" block @click="openFormDrawer({ name: 'account' })">
      <template #icon>
        <Plus :size="18" :stroke-width="2" />
      </template>
      Добавить счёт
    </AppButton>
  </div>

  <AppDragGhost :ghost="ghost">
    <template v-if="draggedAccount">
      <span class="drag-ghost__icon" aria-hidden="true">
        <Wallet :size="18" :stroke-width="1.8" />
      </span>
      <span class="drag-ghost__label">{{ draggedAccount.name }}</span>
    </template>
  </AppDragGhost>
</template>

<style scoped>
.page,
.empty-actions {
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

.hint {
  margin: 0 0 var(--space-3);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.row:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.row.is-lifted {
  opacity: 0.28;
}

.row__grip {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -4px 0 0 -8px;
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
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
  min-height: 56px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.row__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  color: var(--color-accent);
}

.row__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.row__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__name :deep(.n-tag) {
  flex-shrink: 0;
}

.row__amount {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.row__chevron {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  color: var(--color-text-muted);
}

.row__pin {
  flex-shrink: 0;
  margin-top: 8px;
}
</style>
