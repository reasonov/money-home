import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  createAccount,
  fetchAccountMembers,
  fetchAccounts,
  joinAccount,
  leaveAccount,
  mapAccount,
  setAccountCategories,
  shareAccount,
  transferBetweenAccounts,
  updateAccount,
} from '../api/accountApi'
import type { Account, AccountMember } from './types'

export const ALL_ACCOUNTS_ID = 'all'

export const useAccountStore = defineStore('account', () => {
  const items = ref<Account[]>([])
  const members = ref<AccountMember[]>([])
  const loaded = ref(false)
  const selectedAccountId = ref(ALL_ACCOUNTS_ID)

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  const total = computed(() => items.value.reduce((sum, item) => sum + item.amount, 0))
  const selectedAccount = computed(() => getById(selectedAccountId.value))
  const preferredAccountId = computed(() => {
    if (selectedAccountId.value !== ALL_ACCOUNTS_ID && selectedAccount.value) {
      return selectedAccount.value.id
    }
    return items.value[0]?.id ?? ''
  })
  const displayedTotal = computed(() => selectedAccount.value?.amount ?? total.value)

  watch(items, () => {
    if (selectedAccountId.value !== ALL_ACCOUNTS_ID && !getById(selectedAccountId.value)) {
      selectedAccountId.value = ALL_ACCOUNTS_ID
    }
  })

  function upsert(account: Account) {
    const index = items.value.findIndex((item) => item.id === account.id)
    if (index === -1) {
      items.value = [...items.value, account]
      return
    }
    const next = [...items.value]
    next[index] = account
    items.value = next
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
    members.value = members.value.filter((item) => item.accountId !== id)
  }

  function applyRemoteRow(row: Parameters<typeof mapAccount>[0]) {
    upsert(mapAccount(row))
  }

  function membersOf(accountId: string) {
    return members.value.filter((item) => item.accountId === accountId)
  }

  function memberName(userId: string) {
    return members.value.find((item) => item.userId === userId)?.displayName || 'Участник'
  }

  function isShared(accountId: string) {
    return membersOf(accountId).length > 1
  }

  async function load() {
    const [accounts, nextMembers] = await Promise.all([fetchAccounts(), fetchAccountMembers()])
    items.value = accounts
    members.value = nextMembers
    loaded.value = true
  }

  async function addAccount(input: { name: string; openingAmount: number; categoryIds?: string[] }) {
    const account = await createAccount(input)
    upsert(account)
    return account
  }

  async function addByCode(code: string) {
    const account = await joinAccount(code)
    await load()
    return account
  }

  async function enableShare(accountId: string) {
    const account = await shareAccount(accountId)
    upsert(account)
    return account
  }

  async function saveAccount(id: string, userId: string, patch: { name?: string; amount?: number }) {
    const account = await updateAccount(id, userId, patch)
    upsert(account)
    return account
  }

  async function bindCategories(accountId: string, categoryIds: string[]) {
    await setAccountCategories(accountId, categoryIds)
  }

  async function transfer(input: {
    fromAccountId: string
    toAccountId: string
    amount: number
    occurredOn: string
    notes?: string
  }) {
    const tx = await transferBetweenAccounts(input)
    const from = getById(input.fromAccountId)
    const to = getById(input.toAccountId)
    if (from) upsert({ ...from, amount: from.amount - Math.round(input.amount) })
    if (to) upsert({ ...to, amount: to.amount + Math.round(input.amount) })
    return tx
  }

  async function leave(accountId: string) {
    await leaveAccount(accountId)
    remove(accountId)
  }

  function reset() {
    items.value = []
    members.value = []
    loaded.value = false
    selectedAccountId.value = ALL_ACCOUNTS_ID
  }

  return {
    items,
    members,
    loaded,
    selectedAccountId,
    selectedAccount,
    preferredAccountId,
    displayedTotal,
    total,
    upsert,
    remove,
    applyRemoteRow,
    getById,
    membersOf,
    memberName,
    isShared,
    load,
    addAccount,
    addByCode,
    enableShare,
    saveAccount,
    bindCategories,
    transfer,
    leave,
    reset,
  }
})
