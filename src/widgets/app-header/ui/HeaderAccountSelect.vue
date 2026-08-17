<script setup lang="ts">
import { computed, h } from 'vue'
import { storeToRefs } from 'pinia'
import { NSelect, type SelectOption } from 'naive-ui'
import { formatMoney } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)

const options = computed<SelectOption[]>(() => [
  { label: 'Все счета', value: ALL_ACCOUNTS_ID, amount: accounts.total },
  ...accounts.items.map((account) => ({
    label: account.name,
    value: account.id,
    amount: account.amount,
  })),
])

function amountLabelFor(value: string | number | null | undefined) {
  const id = value == null ? '' : String(value)
  if (id === ALL_ACCOUNTS_ID) {
    return formatMoney(accounts.total)
  }
  const account = accounts.getById(id)
  return account ? formatMoney(account.amount) : ''
}

function renderLabel(option: SelectOption) {
  return h('span', { class: 'header-select-option' }, [
    h('span', { class: 'header-select-option__name' }, String(option.label ?? '')),
    h('span', { class: 'header-select-option__amount' }, amountLabelFor(option.value)),
  ])
}
</script>

<template>
  <NSelect
    class="header-select"
    v-model:value="selectedAccountId"
    :options="options"
    :render-label="renderLabel"
    size="medium"
    :consistent-menu-width="false"
    aria-label="Счёт"
  />
</template>

<style scoped>
.header-select {
  width: 100%;
  max-width: 280px;
}

.header-select :deep(.n-base-selection-label) {
  overflow: hidden;
}
</style>

<style>
.header-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.header-select-option__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-select-option__amount {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
</style>
