<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AppField, AppInput, AppSelect, formatDisplayDate, formatMoney, openFormDrawer } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { CategoryIcon, useCategoryStore } from '@/entities/category'
import { type Transaction, type TransactionKind } from '@/entities/transaction'

const props = defineProps<{
  items: Transaction[]
}>()

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const categories = useCategoryStore()

const kind = ref<'all' | TransactionKind | 'income_rule'>('all')
const categoryId = ref('all')
const query = ref('')

const categoryOptions = computed(() => {
  const map = new Map<string, string>()
  const kindFilter = kind.value === 'expense' || kind.value === 'income' ? kind.value : null

  for (const cat of categories.items) {
    if (
      selectedAccountId.value !== ALL_ACCOUNTS_ID &&
      !cat.accountIds.includes(selectedAccountId.value)
    ) {
      continue
    }
    if (kindFilter && cat.kind !== kindFilter) {
      continue
    }
    map.set(cat.id, cat.name)
  }

  for (const item of props.items) {
    if (!item.categoryId || !item.categoryName) {
      continue
    }
    if (kindFilter && item.kind !== kindFilter) {
      continue
    }
    if (!map.has(item.categoryId)) {
      map.set(item.categoryId, item.categoryName)
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

watch(categoryOptions, (options) => {
  if (categoryId.value !== 'all' && categoryId.value !== 'none') {
    if (!options.some((item) => item.id === categoryId.value)) {
      categoryId.value = 'all'
    }
  }
})

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.items.filter((item) => {
    if (kind.value === 'income_rule') {
      if (item.source !== 'income_rule') {
        return false
      }
    } else if (kind.value !== 'all' && item.kind !== kind.value) {
      return false
    }
    if (categoryId.value === 'none' && item.categoryId) {
      return false
    }
    if (
      categoryId.value !== 'all' &&
      categoryId.value !== 'none' &&
      item.categoryId !== categoryId.value
    ) {
      return false
    }
    if (needle) {
      const haystack = `${item.title ?? ''} ${item.categoryName ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) {
        return false
      }
    }
    return true
  })
})

const groups = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const item of filtered.value) {
    const list = map.get(item.occurredOn) ?? []
    list.push(item)
    map.set(item.occurredOn, list)
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }))
})

const emptyText = computed(() => {
  if (
    kind.value !== 'all' ||
    categoryId.value !== 'all' ||
    query.value.trim()
  ) {
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
</script>

<template>
  <div class="list">
    <div class="filters">
      <AppField label="Тип" for-id="tx-kind">
        <AppSelect id="tx-kind" v-model="kind">
          <option value="all">Все</option>
          <option value="expense">Расходы</option>
          <option value="income">Доходы</option>
          <option value="transfer">Переводы</option>
          <option value="income_rule">Пополнения</option>
        </AppSelect>
      </AppField>
      <AppField label="Категория" for-id="tx-category">
        <AppSelect id="tx-category" v-model="categoryId" filterable>
          <option value="all">Все</option>
          <option value="none">Без категории</option>
          <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </AppSelect>
      </AppField>
      <AppField label="Поиск" for-id="tx-query">
        <AppInput id="tx-query" v-model="query" placeholder="Название" />
      </AppField>
    </div>

    <p v-if="!groups.length" class="empty">{{ emptyText }}</p>
    <section v-for="group in groups" :key="group.date" class="group">
      <h2>{{ formatDisplayDate(group.date) }}</h2>
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
          <p class="row__title">{{ item.title || item.categoryName || 'Операция' }}</p>
          <p class="row__meta">
            {{ accountName(item.accountId) }}
            <template v-if="item.kind === 'transfer' && item.counterpartyAccountId">
              → {{ accountName(item.counterpartyAccountId) }}
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.filters > :last-child {
  grid-column: 1 / -1;
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.group h2 {
  font-size: 0.875rem;
  color: var(--color-text-muted);
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
