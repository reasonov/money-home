<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  AppButton,
  confirmAction,
  formatMoney,
  formatRelativeDisplayDate,
  getErrorMessage,
  isPastDate,
  showToast,
  SwipeReveal,
  todayLocal,
} from '@/shared'
import { useActivityStore, UnseenPurchaseDot } from '@/entities/activity'
import { usePurchaseStore, PurchaseNotes, type Purchase } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const store = usePurchaseStore()
const session = useSessionStore()
const activity = useActivityStore()
const menuOpenId = ref<string | null>(null)
const menuStyle = ref<Record<string, string>>({})
const swipeOpenId = ref<string | null>(null)
const menuButtons = new Map<string, HTMLElement>()

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
  const sorted = [...store.planned].sort((a, b) => {
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
      title: 'Отметить готовым?',
      message: `Списать ${formatMoney(purchase.amount)} с общего баланса и перенести «${purchase.title}» в историю.`,
      confirmLabel: 'Готово',
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
  void router.push({ name: 'purchase-edit', params: { id } })
}
</script>

<template>
  <section class="list">
    <div class="list__head">
      <h2 class="list__title">План покупок</h2>
    </div>

    <div v-if="groups.length" class="list__groups" @click="closeOverlays">
      <section v-for="group in groups" :key="group.date" class="group">
        <h3 class="group__date" :class="{ 'is-overdue': group.overdue }">
          {{ formatRelativeDisplayDate(group.date) }}
        </h3>
        <ul class="group__items">
          <li v-for="item in group.items" :key="item.id">
            <SwipeReveal
              label="Готово"
              :open="swipeOpenId === item.id"
              @update:open="setSwipeOpen(item.id, $event)"
              @action="markDone(item.id, { confirm: false })"
            >
              <div
                class="item"
                :class="{ 'is-overdue': group.overdue }"
                @click="acknowledge(item.id)"
              >
                <div class="item__main">
                  <p class="item__title">
                    <UnseenPurchaseDot :purchase-id="item.id">
                      {{ item.title }}
                    </UnseenPurchaseDot>
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
      <p class="list__empty-text">Пока нет запланированных покупок</p>
      <div class="list__empty-actions">
        <RouterLink to="/purchases/new" custom v-slot="{ navigate }">
          <AppButton block @click="navigate">Добавить покупку</AppButton>
        </RouterLink>
        <RouterLink to="/income" custom v-slot="{ navigate }">
          <AppButton variant="secondary" block @click="navigate">Настроить пополнение</AppButton>
        </RouterLink>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpenId"
        class="item__dropdown"
        role="menu"
        :style="menuStyle"
        @click.stop
      >
        <button
          type="button"
          role="menuitem"
          @click="markDone(menuOpenId, { event: $event })"
        >
          Готово
        </button>
        <button type="button" role="menuitem" @click="edit(menuOpenId, $event)">
          Изменить
        </button>
        <button
          type="button"
          class="is-muted"
          role="menuitem"
          @click="cancel(menuOpenId, $event)"
        >
          Отмена
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

.list__title {
  font-size: 1.125rem;
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
}

.item.is-overdue {
  border-color: color-mix(in srgb, var(--color-warning) 25%, transparent);
  background: var(--color-warning-soft);
}

.item__main {
  min-width: 0;
  flex: 1;
}

.item__title {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.item__meta {
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-warning);
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
