<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Plus } from '@lucide/vue'
import { useRouter } from 'vue-router'
import {
  AppButton,
  AppEmpty,
  AppSwitch,
  AppTag,
  formatMoney,
  MAX_SIDEBAR_ACCOUNTS,
  openFormDrawer,
  resolvePinnedAccountIds,
  showToast,
  sortAccountsByOrder,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { usePreferencesStore } from '@/entities/preferences'
import { AccountAvailableHint } from '@/widgets/account-available'

const router = useRouter()
const accounts = useAccountStore()
const prefs = usePreferencesStore()

const orderedAccounts = computed(() => sortAccountsByOrder(accounts.items, prefs.accountOrder))
const orderedIds = computed(() => orderedAccounts.value.map((account) => account.id))
const pinnedIds = computed(() => new Set(resolvePinnedAccountIds(orderedIds.value, prefs.sidebarAccountIds)))

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
    <p class="hint">До трёх счетов можно показать в боковом меню. Их порядок меняется там же.</p>

    <div class="list">
      <article v-for="account in orderedAccounts" :key="account.id" class="card">
        <button
          class="card__main"
          type="button"
          :aria-label="`Открыть счёт «${account.name}»`"
          @click="openAccount(account.id)"
        >
          <span class="card__head">
            <span class="card__identity">
              <span class="card__name">{{ account.name }}</span>
              <span v-if="accounts.isShared(account.id) || account.excludeFromTotal" class="card__tags">
                <AppTag v-if="accounts.isShared(account.id)" type="primary">Общий счёт</AppTag>
                <AppTag v-if="account.excludeFromTotal" type="default">Не в итоге</AppTag>
              </span>
            </span>
            <span class="card__chevron" aria-hidden="true">
              <ChevronRight :size="18" :stroke-width="1.8" />
            </span>
          </span>
          <span class="card__amount">{{ formatMoney(account.amount) }}</span>
          <AccountAvailableHint compact :account-id="account.id" :balance="account.amount" />
        </button>
        <label class="card__pin">
          <span>В меню</span>
          <AppSwitch
            size="small"
            :checked="isPinned(account.id)"
            :aria-label="`Показывать «${account.name}» в меню`"
            @update:checked="(checked) => setPinned(account.id, checked)"
          />
        </label>
      </article>
    </div>

    <AppButton variant="secondary" block @click="openFormDrawer({ name: 'account' })">
      <template #icon>
        <Plus :size="18" :stroke-width="2" />
      </template>
      Добавить счёт
    </AppButton>
  </div>
</template>

<style scoped>
.page,
.empty-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--color-text-muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.card__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.card__identity {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.card__name {
  min-width: 0;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.card__chevron {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-right: -4px;
  color: var(--color-text-muted);
}

.card__amount {
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.card__pin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}
</style>
