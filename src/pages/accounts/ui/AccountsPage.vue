<script setup lang="ts">
import { ChevronRight, Plus, Wallet } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { AppButton, AppEmpty, AppTag, formatMoney, openFormDrawer } from '@/shared'
import { useAccountStore } from '@/entities/account'

const router = useRouter()
const accounts = useAccountStore()

function openAccount(id: string) {
  void router.push({ name: 'account-detail', params: { id } })
}
</script>

<template>
  <AppEmpty v-if="!accounts.items.length" description="Пока нет счетов">
    <div class="empty-actions">
      <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
      <AppButton variant="secondary" block @click="openFormDrawer({ name: 'account', mode: 'join' })">
        Ввести код
      </AppButton>
    </div>
  </AppEmpty>

  <div v-else class="page">
    <section class="card">
      <button
        v-for="account in accounts.items"
        :key="account.id"
        class="row"
        type="button"
        :aria-label="`Открыть счёт «${account.name}»`"
        @click="openAccount(account.id)"
      >
        <span class="row__icon" aria-hidden="true">
          <Wallet :size="18" :stroke-width="1.8" />
        </span>
        <span class="row__name">
          {{ account.name }}
          <AppTag v-if="accounts.isShared(account.id)" type="primary">общий</AppTag>
        </span>
        <span class="row__amount">{{ formatMoney(account.amount) }}</span>
        <span class="row__chevron" aria-hidden="true">
          <ChevronRight :size="18" :stroke-width="1.8" />
        </span>
      </button>
    </section>

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

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
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
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.row:first-of-type {
  border-top: 0;
}

.row__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.row__name {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
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
  color: var(--color-text-muted);
}
</style>
