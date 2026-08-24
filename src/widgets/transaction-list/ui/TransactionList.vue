<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AppInput,
  AppSelect,
  formatDisplayDate,
  formatMoney,
  openFormDrawer,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { CategoryIcon, splitCategorySections, useCategoryStore } from '@/entities/category'
import {
  statsSummary,
  type Transaction,
  type TransactionKind,
} from '@/entities/transaction'
import { PendingDot } from '@/entities/sync'

type KindFilter = TransactionKind | 'income_rule' | 'expense_rule'

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
  { value: 'transfer', label: 'Переводы' },
  { value: 'income_rule', label: 'Пополнения' },
  { value: 'expense_rule', label: 'Регулярные расходы' },
]

const EXPENSE_KINDS: KindFilter[] = ['expense', 'expense_rule']
const INCOME_KINDS: KindFilter[] = ['income', 'income_rule']

const props = defineProps<{
  items: Transaction[]
  initialKind?: 'expense' | 'income'
  initialCategoryId?: string
  initialGroupId?: string
}>()

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const categories = useCategoryStore()

const kinds = ref<string[]>([])
const categoryId = ref('all')
const query = ref('')

watch(
  () => [props.initialKind, props.initialCategoryId, props.initialGroupId] as const,
  ([nextKind, nextCategory, nextGroup]) => {
    kinds.value = nextKind ? [nextKind] : []
    if (nextGroup) {
      categoryId.value = `group:${nextGroup}`
      return
    }
    categoryId.value = nextCategory ?? 'all'
  },
  { immediate: true },
)

const selectedKinds = computed(() => kinds.value as KindFilter[])

const categoryKindFilter = computed<'expense' | 'income' | null>(() => {
  const selected = selectedKinds.value
  if (!selected.length) {
    return null
  }
  if (selected.every((key) => EXPENSE_KINDS.includes(key))) {
    return 'expense'
  }
  if (selected.every((key) => INCOME_KINDS.includes(key))) {
    return 'income'
  }
  return null
})

const visibleCategories = computed(() => {
  const kindFilter = categoryKindFilter.value
  return categories.items.filter((cat) => {
    if (
      selectedAccountId.value !== ALL_ACCOUNTS_ID &&
      !cat.accountIds.includes(selectedAccountId.value)
    ) {
      return false
    }
    if (kindFilter && cat.kind !== kindFilter) {
      return false
    }
    return true
  })
})

const filterSections = computed(() => {
  const kindsToShow: Array<'expense' | 'income'> = categoryKindFilter.value
    ? [categoryKindFilter.value]
    : ['expense', 'income']
  const grouped = kindsToShow.flatMap(
    (kind) => splitCategorySections(visibleCategories.value, categories.groups, kind).grouped,
  )
  const ungrouped = kindsToShow.flatMap(
    (kind) => splitCategorySections(visibleCategories.value, categories.groups, kind).ungrouped,
  )
  const known = new Set(visibleCategories.value.map((item) => item.id))
  const extras: { id: string; name: string }[] = []
  for (const item of props.items) {
    if (!item.categoryId || !item.categoryName || known.has(item.categoryId)) continue
    if (categoryKindFilter.value && item.kind !== categoryKindFilter.value) continue
    if (extras.some((row) => row.id === item.categoryId)) continue
    extras.push({ id: item.categoryId, name: item.categoryName })
  }
  return { grouped, ungrouped, extras }
})

const filterValues = computed(() => {
  const ids = new Set<string>(['all', 'none'])
  for (const section of filterSections.value.grouped) ids.add(`group:${section.group.id}`)
  for (const cat of filterSections.value.ungrouped) ids.add(cat.id)
  for (const cat of filterSections.value.extras) ids.add(cat.id)
  for (const section of filterSections.value.grouped) {
    for (const cat of section.categories) ids.add(cat.id)
  }
  return ids
})

watch(filterValues, (ids) => {
  if (categoryId.value !== 'all' && categoryId.value !== 'none' && !ids.has(categoryId.value)) {
    categoryId.value = 'all'
  }
})

function matchesKind(item: Transaction, selected: KindFilter[]): boolean {
  if (!selected.length) {
    return true
  }
  return selected.some((key) => {
    if (key === 'income_rule') {
      return item.source === 'income_rule'
    }
    if (key === 'expense_rule') {
      return item.source === 'expense_rule'
    }
    return item.kind === key
  })
}

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const selected = selectedKinds.value
  return props.items.filter((item) => {
    if (!matchesKind(item, selected)) {
      return false
    }
    if (categoryId.value === 'none' && item.categoryId) {
      return false
    }
    if (categoryId.value.startsWith('group:')) {
      const groupId = categoryId.value.slice(6)
      const cat = item.categoryId ? categories.getById(item.categoryId) : undefined
      if (cat?.groupId !== groupId) {
        return false
      }
    } else if (
      categoryId.value !== 'all' &&
      categoryId.value !== 'none' &&
      item.categoryId !== categoryId.value
    ) {
      return false
    }
    if (needle) {
      const haystack = `${item.title ?? ''} ${item.categoryName ?? ''} ${item.notes ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) {
        return false
      }
    }
    return true
  })
})

function itemsTotal(list: Transaction[]): number {
  if (list.length > 0 && list.every((item) => item.kind === 'transfer')) {
    return -list.reduce((sum, item) => sum + item.amount, 0)
  }
  return statsSummary(list).net
}

function formatSigned(amount: number): string {
  const prefix = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${prefix}${formatMoney(Math.abs(amount))}`
}

function amountClass(amount: number): string {
  if (amount > 0) {
    return 'is-in'
  }
  if (amount < 0) {
    return 'is-out'
  }
  return ''
}

const periodTotal = computed(() => itemsTotal(filtered.value))

const groups = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const item of filtered.value) {
    const list = map.get(item.occurredOn) ?? []
    list.push(item)
    map.set(item.occurredOn, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => {
      const sorted = [...items].sort(
        (a, b) =>
          (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id.localeCompare(a.id),
      )
      const total = itemsTotal(sorted)
      return {
        date,
        items: sorted,
        total,
        totalText: formatSigned(total),
        totalClass: amountClass(total),
      }
    })
})

const emptyText = computed(() => {
  if (kinds.value.length || categoryId.value !== 'all' || query.value.trim()) {
    return 'Ничего не найдено'
  }
  return 'Операций пока нет'
})

function sign(kindValue: TransactionKind) {
  return kindValue === 'income' ? '+' : '−'
}

function accountName(id: string) {
  return accounts.getById(id)?.name ?? 'Счёт'
}

function openItem(item: Transaction) {
  openFormDrawer({ name: 'transaction-edit', transactionId: item.id })
}

const showAuthor = computed(
  () =>
    selectedAccountId.value === ALL_ACCOUNTS_ID ||
    accounts.isShared(selectedAccountId.value),
)
</script>

<template>
  <div class="list">
    <div class="filters">
      <div class="filters__row">
        <AppSelect
          id="tx-kind"
          v-model="kinds"
          multiple
          clearable
          size="medium"
          placeholder="Все типы"
          aria-label="Тип операций"
        >
          <option v-for="option in KIND_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </AppSelect>
        <AppSelect id="tx-category" v-model="categoryId" size="medium" filterable aria-label="Категория">
          <option value="all">Все категории</option>
          <option value="none">Без категории</option>
          <optgroup
            v-for="section in filterSections.grouped"
            :key="section.group.id"
            :label="section.group.name"
          >
            <option :value="`group:${section.group.id}`">Вся группа</option>
            <option v-for="cat in section.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </optgroup>
          <optgroup
            v-if="filterSections.ungrouped.length || filterSections.extras.length"
            label="Без группы"
          >
            <option v-for="cat in filterSections.ungrouped" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
            <option v-for="cat in filterSections.extras" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </optgroup>
        </AppSelect>
      </div>
      <AppInput id="tx-query" v-model="query" size="medium" placeholder="Поиск" />
    </div>

    <p v-if="groups.length" class="total">
      <span>Итого</span>
      <span class="row__amount" :class="amountClass(periodTotal)">{{ formatSigned(periodTotal) }}</span>
    </p>
    <p v-else class="empty">{{ emptyText }}</p>
    <section v-for="group in groups" :key="group.date" class="group">
      <h2 class="group__head">
        <span>{{ formatDisplayDate(group.date) }}</span>
        <span class="row__amount" :class="group.totalClass">{{ group.totalText }}</span>
      </h2>
      <button
        v-for="item in group.items"
        :key="item.id"
        class="row"
        type="button"
        :aria-label="`Изменить «${item.title || item.categoryName || 'Операция'}»`"
        @click="openItem(item)"
      >
        <CategoryIcon
          v-if="item.categoryIcon && item.categoryColor"
          :icon="item.categoryIcon"
          :color="item.categoryColor"
          :size="32"
        />
        <div class="row__body">
          <p class="row__title">
            <PendingDot :entity-id="item.id">
              {{ item.title || item.categoryName || 'Операция' }}
            </PendingDot>
          </p>
          <p class="row__meta">
            {{ accountName(item.accountId) }}
            <template v-if="item.kind === 'transfer' && item.counterpartyAccountId">
              → {{ accountName(item.counterpartyAccountId) }}
            </template>
            <template v-if="showAuthor">
              · {{ accounts.memberName(item.createdBy) }}
            </template>
          </p>
        </div>
        <p class="row__amount" :class="item.kind === 'income' ? 'is-in' : 'is-out'">
          {{ sign(item.kind) }}{{ formatMoney(item.amount) }}
        </p>
      </button>
    </section>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.filters__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.total,
.group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.total {
  font-weight: 700;
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-3);
  border: 0;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row__body {
  flex: 1;
  min-width: 0;
}

.row__title {
  font-weight: 700;
}

.row__meta,
.empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.row__amount {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.is-in {
  color: var(--color-success);
}

.is-out {
  color: var(--color-warning);
}
</style>
