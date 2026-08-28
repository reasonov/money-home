<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EllipsisVertical } from '@lucide/vue'
import { NDropdown, type DropdownOption } from 'naive-ui'
import {
  AppInput,
  AppSelect,
  AppSwitch,
  AppTag,
  confirmAction,
  formatMoney,
  formatRelativeDisplayDate,
  getErrorMessage,
  showToast,
  SwipeReveal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useActivityStore, UnseenPurchaseDot } from '@/entities/activity'
import { CategoryIcon, splitCategorySections, useCategoryStore } from '@/entities/category'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore, PurchaseNotes } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'
import { PendingDot } from '@/entities/sync'
import { useTransferRuleStore } from '@/entities/transfer-rule'
import { openPlanEvent } from '../lib/openPlanCreate'
import {
  PLAN_KIND_LABEL,
  PLAN_KIND_TAG,
  usePlanEvents,
  type PlanEvent,
  type PlanEventKind,
  type PlanScope,
} from '../lib/usePlanEvents'

const BACKLOG_KEY = 'backlog'
const INACTIVE_KEY = 'inactive'

const props = defineProps<{
  scope: PlanScope
  focusPurchaseId?: string
  focusRuleId?: string
  focusRuleKind?: PlanEventKind
}>()

const emit = defineEmits<{
  focused: []
}>()

const purchases = usePurchaseStore()
const incomeRules = useIncomeRuleStore()
const expenseRules = useExpenseRuleStore()
const transferRules = useTransferRuleStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const session = useSessionStore()
const activity = useActivityStore()
const { events } = usePlanEvents(
  () => props.scope,
  () => null,
)

const swipeOpenId = ref<string | null>(null)
const highlightedKey = ref<string | null>(null)
const itemEls = new Map<string, HTMLElement>()
const query = ref('')
const categoryId = ref('all')
const error = ref('')
const togglingKey = ref<string | null>(null)

const purchaseMenuOptions: DropdownOption[] = [
  { label: 'Отметить как купленную', key: 'done' },
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Убрать из плана',
    key: 'cancel',
    props: { style: { color: 'var(--color-text-muted)' } },
  },
]

const ruleMenuOptions: DropdownOption[] = [
  { label: 'Изменить', key: 'edit' },
  {
    label: 'Удалить',
    key: 'remove',
    props: { style: { color: 'var(--color-danger)' } },
  },
]

function setItemEl(key: string, el: unknown) {
  if (el instanceof HTMLElement) {
    itemEls.set(key, el)
    return
  }
  itemEls.delete(key)
}

const showFilters = computed(() => props.scope === 'purchases')
const showKindTag = computed(() => props.scope !== 'purchases')

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
      ? purchases.planned
      : purchases.planned.filter((item) => item.accountId === accounts.selectedAccountId)
  for (const item of source) {
    if (!item.categoryId || !item.categoryName || known.has(item.categoryId)) continue
    if (extras.some((row) => row.id === item.categoryId)) continue
    extras.push({ id: item.categoryId, name: item.categoryName })
  }
  return { ...split, extras }
})

const hasFilters = computed(() => categoryId.value !== 'all' || Boolean(query.value.trim()))

const filteredEvents = computed(() => {
  if (!showFilters.value) {
    return events.value
  }
  const needle = query.value.trim().toLowerCase()
  return events.value.filter((item) => {
    if (categoryId.value.startsWith('group:')) {
      const groupId = categoryId.value.slice(6)
      const cat = item.purchaseId
        ? purchases.getById(item.purchaseId)?.categoryId
        : undefined
      const group = cat ? categories.getById(cat)?.groupId : undefined
      if (group !== groupId) {
        return false
      }
    } else if (categoryId.value !== 'all') {
      const cat = item.purchaseId ? purchases.getById(item.purchaseId)?.categoryId : undefined
      if (cat !== categoryId.value) {
        return false
      }
    }
    if (needle) {
      const haystack = `${item.title} ${item.notes ?? ''} ${item.categoryName ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) {
        return false
      }
    }
    return true
  })
})

const groups = computed(() => {
  const map = new Map<string, PlanEvent[]>()
  const backlog: PlanEvent[] = []
  const inactive: PlanEvent[] = []

  for (const item of filteredEvents.value) {
    if (item.ruleId && item.active === false) {
      inactive.push(item)
      continue
    }
    if (!item.date) {
      backlog.push(item)
      continue
    }
    const list = map.get(item.date) ?? []
    list.push(item)
    map.set(item.date, list)
  }

  const dated = [...map.entries()].map(([date, items]) => ({
    key: date,
    title: formatRelativeDisplayDate(date),
    overdue: items.some((item) => item.overdue),
    items,
  }))

  if (backlog.length) {
    dated.push({
      key: BACKLOG_KEY,
      title: backlog.every((item) => item.kind !== 'purchase') ? 'По расписанию' : 'На будущее',
      overdue: false,
      items: backlog,
    })
  }

  if (inactive.length) {
    dated.push({
      key: INACTIVE_KEY,
      title: 'Выключены',
      overdue: false,
      items: inactive,
    })
  }

  return dated
})

const emptyText = computed(() => {
  if (showFilters.value && hasFilters.value) {
    return 'Ничего не найдено'
  }
  if (props.scope === 'regular') {
    return 'Пока нет регулярных операций. Без них приложение не сможет подсказать, когда хватит денег на покупку.'
  }
  if (props.scope === 'purchases') {
    return 'Пока нет запланированных покупок'
  }
  return 'Пока нет планов'
})

function amountTone(item: PlanEvent) {
  if (item.kind === 'income' || item.inflow) {
    return 'in'
  }
  if (item.kind === 'transfer' && item.inflow == null) {
    return 'xfer'
  }
  return 'out'
}

function amountPrefix(item: PlanEvent) {
  const tone = amountTone(item)
  if (tone === 'in') {
    return '+'
  }
  if (tone === 'out') {
    return '−'
  }
  return ''
}

function closeOverlays() {
  swipeOpenId.value = null
}

function setSwipeOpen(id: string, open: boolean) {
  swipeOpenId.value = open ? id : swipeOpenId.value === id ? null : swipeOpenId.value
}

function openItem(item: PlanEvent) {
  closeOverlays()
  if (item.purchaseId) {
    activity.markPurchaseSeen(item.purchaseId)
  }
  openPlanEvent(item)
}

async function markDone(id: string, options?: { confirm?: boolean }) {
  closeOverlays()
  const purchase = purchases.getById(id)
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

  activity.markPurchaseSeen(id)
  try {
    await purchases.markDone(id)
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось завершить покупку'))
  }
}

async function cancelPurchase(id: string) {
  closeOverlays()
  const purchase = purchases.getById(id)
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

  activity.markPurchaseSeen(id)
  try {
    await purchases.setCancelled(id, userId)
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось отменить покупку'))
  }
}

function onPurchaseMenu(item: PlanEvent, key: string | number) {
  if (!item.purchaseId) {
    return
  }
  if (key === 'done') {
    void markDone(item.purchaseId)
    return
  }
  if (key === 'edit') {
    openItem(item)
    return
  }
  if (key === 'cancel') {
    void cancelPurchase(item.purchaseId)
  }
}

async function onRemoveRule(item: PlanEvent) {
  if (!item.ruleId) {
    return
  }
  const titles = {
    income: 'Удалить регулярное пополнение?',
    expense: 'Удалить регулярный расход?',
    transfer: 'Удалить регулярный перевод?',
  }
  const messages = {
    income: 'Будущие пополнения по этому расписанию не будут зачисляться и учитываться в прогнозе.',
    expense: 'Будущие списания по этому расписанию не будут выполняться и учитываться в прогнозе.',
    transfer: 'Будущие переводы по этому расписанию не будут выполняться и учитываться в прогнозе.',
  }
  if (item.kind === 'purchase') {
    return
  }
  const ok = await confirmAction({
    title: titles[item.kind],
    message: messages[item.kind],
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!ok) {
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }
  try {
    if (item.kind === 'income') {
      await incomeRules.removeRule(item.ruleId, userId)
    } else if (item.kind === 'expense') {
      await expenseRules.removeRule(item.ruleId, userId)
    } else {
      await transferRules.removeRule(item.ruleId, userId)
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить правило')
  }
}

async function onToggleRule(item: PlanEvent, active: boolean) {
  if (!item.ruleId || item.active === active || togglingKey.value === item.key) {
    return
  }
  const userId = session.user?.id
  if (!userId) {
    return
  }
  togglingKey.value = item.key
  try {
    if (item.kind === 'income') {
      await incomeRules.updateRule(item.ruleId, userId, { active })
    } else if (item.kind === 'expense') {
      await expenseRules.updateRule(item.ruleId, userId, { active })
    } else if (item.kind === 'transfer') {
      await transferRules.updateRule(item.ruleId, userId, { active })
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось обновить правило')
  } finally {
    togglingKey.value = null
  }
}

function onRuleMenu(item: PlanEvent, key: string | number) {
  if (key === 'edit') {
    openItem(item)
    return
  }
  if (key === 'remove') {
    void onRemoveRule(item)
  }
}

onMounted(() => {
  activity.consumeShownPurchases()
})

onBeforeUnmount(() => {
  const shown = purchases.planned
    .filter((item) => activity.hasUnseenForPurchase(item.id))
    .map((item) => item.id)
  activity.rememberShownPurchases(shown)
})

async function reveal(key: string) {
  query.value = ''
  categoryId.value = 'all'
  highlightedKey.value = key
  await nextTick()
  itemEls.get(key)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  emit('focused')
}

watch(
  () => [props.focusPurchaseId, props.focusRuleId, props.focusRuleKind] as const,
  ([purchaseId, ruleId, ruleKind]) => {
    if (purchaseId) {
      void reveal(`purchase:${purchaseId}`)
      return
    }
    if (ruleId && ruleKind && ruleKind !== 'purchase') {
      void reveal(`${ruleKind}:${ruleId}`)
    }
  },
  { immediate: true, flush: 'post' },
)

watch(
  () => props.scope,
  () => {
    query.value = ''
    categoryId.value = 'all'
  },
)
</script>

<template>
  <section class="list">
    <div v-if="showFilters" class="filters">
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
      <section v-for="group in groups" :key="group.key" class="group">
        <h3
          class="group__date"
          :class="{
            'is-overdue': group.overdue,
            'is-backlog': group.key === BACKLOG_KEY || group.key === INACTIVE_KEY,
          }"
        >
          {{ group.title }}
        </h3>
        <ul class="group__items">
          <li v-for="item in group.items" :key="item.key">
            <SwipeReveal
              v-if="item.purchaseId"
              label="Куплено"
              :open="swipeOpenId === item.purchaseId"
              @update:open="setSwipeOpen(item.purchaseId, $event)"
              @action="markDone(item.purchaseId, { confirm: false })"
            >
              <div
                :ref="(el) => setItemEl(item.key, el)"
                class="item"
                :class="{
                  'is-overdue': item.overdue,
                  'is-focus': highlightedKey === item.key,
                }"
                @click.stop="openItem(item)"
              >
                <div class="item__main">
                  <p class="item__title">
                    <UnseenPurchaseDot :purchase-id="item.purchaseId">
                      <PendingDot :entity-id="item.purchaseId">
                        {{ item.title }}
                      </PendingDot>
                    </UnseenPurchaseDot>
                  </p>
                  <p class="item__meta-row">
                    <AppTag v-if="showKindTag" :type="PLAN_KIND_TAG[item.kind]">
                      {{ PLAN_KIND_LABEL[item.kind] }}
                    </AppTag>
                    <span class="item__account">{{ item.accountLabel }}</span>
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
                  <p v-if="item.overdue" class="item__overdue">Просрочено</p>
                </div>
                <div class="item__side">
                  <p class="item__amount money" :class="`is-${amountTone(item)}`">
                    {{ amountPrefix(item) }}{{ formatMoney(item.amount) }}
                  </p>
                  <NDropdown
                    trigger="click"
                    placement="bottom-end"
                    :options="purchaseMenuOptions"
                    @select="(key) => onPurchaseMenu(item, key)"
                  >
                    <button
                      type="button"
                      class="item__more"
                      aria-label="Ещё действия"
                      @click.stop
                    >
                      <EllipsisVertical :size="16" :stroke-width="2" />
                    </button>
                  </NDropdown>
                </div>
              </div>
            </SwipeReveal>
            <div
              v-else
              :ref="(el) => setItemEl(item.key, el)"
              class="item"
              :class="{
                'is-focus': highlightedKey === item.key,
                'is-off': item.active === false,
              }"
              @click="openItem(item)"
            >
              <div class="item__main">
                <p class="item__title">{{ item.title }}</p>
                <p class="item__meta-row">
                  <AppTag v-if="showKindTag" :type="PLAN_KIND_TAG[item.kind]">
                    {{ PLAN_KIND_LABEL[item.kind] }}
                  </AppTag>
                  <span class="item__account">
                    {{ item.accountLabel }}<template v-if="item.period"> · {{ item.period }}</template>
                  </span>
                </p>
              </div>
              <div class="item__side">
                <p class="item__amount money" :class="`is-${amountTone(item)}`">
                  {{ amountPrefix(item) }}{{ formatMoney(item.amount) }}
                </p>
                <div class="item__controls" @click.stop>
                  <AppSwitch
                    size="small"
                    :checked="item.active !== false"
                    :loading="togglingKey === item.key"
                    :aria-label="item.active === false ? 'Включить правило' : 'Выключить правило'"
                    @update:checked="(active) => onToggleRule(item, active)"
                  />
                  <NDropdown
                    trigger="click"
                    placement="bottom-end"
                    :options="ruleMenuOptions"
                    @select="(key) => onRuleMenu(item, key)"
                  >
                    <button type="button" class="item__more" aria-label="Ещё действия">
                      <EllipsisVertical :size="16" :stroke-width="2" />
                    </button>
                  </NDropdown>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div v-else class="list__empty">
      <p class="list__empty-text">{{ emptyText }}</p>
    </div>

    <p v-if="error" class="list__error" role="alert">{{ error }}</p>
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
  margin: 0 0 var(--space-3);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.group__date.is-overdue {
  color: var(--color-warning);
  text-transform: none;
}

.group__date.is-backlog {
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

.item.is-off .item__title,
.item.is-off .item__meta-row,
.item.is-off .item__amount {
  opacity: 0.55;
}

.item__main {
  min-width: 0;
  flex: 1;
}

.item__title {
  display: block;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.item__account {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__overdue {
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-warning);
}

.item__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: var(--space-2);
}

.item__amount {
  flex-shrink: 0;
  font-weight: 800;
}

.item__controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.item__more {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.item__more:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.item__more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.list__empty {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.list__empty-text {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.list__error {
  margin: 0;
  color: var(--color-warning);
  font-size: 0.875rem;
}

.money {
  font-variant-numeric: tabular-nums;
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}

.is-xfer {
  color: var(--color-accent);
}
</style>
