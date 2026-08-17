<script setup lang="ts">
import { Bell } from '@lucide/vue'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AppDrawer, openFormDrawer } from '@/shared'
import { formatRelativeTime, useActivityStore, type ActivityItem } from '@/entities/activity'
import { usePurchaseStore } from '@/entities/purchase'
import { AutoIncomeActions } from '@/features/review-auto-income'

const router = useRouter()
const store = useActivityStore()
const purchases = usePurchaseStore()
const open = ref(false)
const highlightIds = ref(new Set<string>())

function openInbox() {
  open.value = true
}

watch(open, (value) => {
  if (value) {
    highlightIds.value = new Set(store.unseen.map((item) => item.id))
    store.markAllSeen()
    return
  }
  highlightIds.value = new Set()
})

function openActivity(item: ActivityItem) {
  if (!item.purchaseId) {
    return
  }

  const purchase = purchases.getById(item.purchaseId)
  open.value = false

  if (!purchase) {
    return
  }

  if (purchase.status === 'planned') {
    openFormDrawer({ name: 'purchase-edit', purchaseId: purchase.id })
    return
  }

  if (purchase.status === 'done') {
    void router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="inbox">
    <button
      type="button"
      class="inbox__bell"
      aria-label="Уведомления"
      :aria-expanded="open"
      @click="openInbox"
    >
      <span class="inbox__icon" aria-hidden="true">
        <Bell :size="22" :stroke-width="1.7" />
      </span>
      <span v-if="store.unseenCount" class="inbox__count">
        {{ store.unseenCount > 9 ? '9+' : store.unseenCount }}
      </span>
    </button>

    <AppDrawer v-model:open="open" title="Что нового" height="70%">
      <ul v-if="store.recent.length" class="feed">
        <li
          v-for="item in store.recent"
          :key="item.id"
          class="feed__item"
          :class="{
            'is-unseen': highlightIds.has(item.id),
            'is-clickable': Boolean(item.purchaseId || item.transactionId),
          }"
        >
          <button
            v-if="item.purchaseId"
            type="button"
            class="feed__button"
            @click="openActivity(item)"
          >
            <span class="feed__dot" aria-hidden="true" />
            <span class="feed__body">
              <span class="feed__summary">{{ item.summary }}</span>
              <span class="feed__meta">
                <span>{{ item.actorName }}</span>
                <span aria-hidden="true">·</span>
                <time :datetime="item.createdAt">{{ formatRelativeTime(item.createdAt) }}</time>
              </span>
            </span>
          </button>
          <template v-else>
            <span class="feed__dot" aria-hidden="true" />
            <div class="feed__body">
              <p class="feed__summary">{{ item.summary }}</p>
              <p class="feed__meta">
                <span>{{ item.actorName }}</span>
                <span aria-hidden="true">·</span>
                <time :datetime="item.createdAt">{{ formatRelativeTime(item.createdAt) }}</time>
              </p>
              <AutoIncomeActions
                v-if="item.kind === 'income_auto_posted' && item.transactionId"
                :transaction-id="item.transactionId"
                kind="income"
              />
              <AutoIncomeActions
                v-else-if="item.kind === 'expense_auto_posted' && item.transactionId"
                :transaction-id="item.transactionId"
                kind="expense"
              />
            </div>
          </template>
        </li>
      </ul>
      <p v-else class="feed__empty">Пока нет изменений</p>
    </AppDrawer>
  </div>
</template>

<style scoped>
.inbox {
  position: relative;
}

.inbox__bell {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.inbox__bell:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.inbox__icon {
  display: grid;
  place-items: center;
}

.inbox__count {
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--color-warning);
  color: var(--color-on-accent);
  font-size: 0.625rem;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.feed__item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
}

.feed__item.is-unseen {
  background: var(--color-accent-soft);
}

.feed__button {
  display: flex;
  gap: var(--space-3);
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.feed__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: transparent;
}

.feed__item.is-unseen .feed__dot {
  background: var(--color-accent);
}

.feed__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.feed__summary {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--color-text);
}

.feed__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: var(--space-1) 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.feed__empty {
  margin: 0;
  padding: var(--space-4) 0;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
