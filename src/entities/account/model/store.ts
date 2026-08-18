import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  assertOnline,
  assertWritable,
  createUuid,
  enqueueMutation,
  getErrorMessage,
} from '@/shared'
import { useSessionStore } from '@/entities/session'
import { useCategoryStore } from '@/entities/category'
import {
  deleteAccount as deleteAccountRemote,
  fetchAccountMembers,
  fetchAccounts,
  joinAccount,
  mapAccount,
  shareAccount,
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
  const includedTotal = computed(() =>
    items.value.reduce((sum, item) => (item.excludeFromTotal ? sum : sum + item.amount), 0),
  )
  const selectedAccount = computed(() => getById(selectedAccountId.value))
  const preferredAccountId = computed(() => {
    if (selectedAccountId.value !== ALL_ACCOUNTS_ID && selectedAccount.value) {
      return selectedAccount.value.id
    }
    return items.value[0]?.id ?? ''
  })
  const displayedTotal = computed(() => selectedAccount.value?.amount ?? includedTotal.value)

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

  function applyAmountDelta(accountId: string, delta: number) {
    const account = getById(accountId)
    if (!account || !delta) {
      return
    }
    upsert({ ...account, amount: account.amount + delta })
  }

  function hydrate(accounts: Account[], nextMembers: AccountMember[], selectedId?: string) {
    items.value = accounts
    members.value = nextMembers
    loaded.value = true
    if (selectedId) {
      selectedAccountId.value = selectedId
    }
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

  function requireUserId() {
    const userId = useSessionStore().user?.id
    if (!userId) {
      throw new Error(getErrorMessage('not authenticated', 'Войдите в аккаунт'))
    }
    return userId
  }

  async function load() {
    const [accounts, nextMembers] = await Promise.all([fetchAccounts(), fetchAccountMembers()])
    items.value = accounts
    members.value = nextMembers
    loaded.value = true
  }

  async function addAccount(input: { name: string; openingAmount: number; categoryIds?: string[] }) {
    assertWritable()
    const userId = requireUserId()
    const session = useSessionStore()
    const id = createUuid()
    const account: Account = {
      id,
      name: input.name.trim() || 'Основной счёт',
      amount: Math.round(input.openingAmount),
      ownerId: userId,
      inviteCode: null,
      excludeFromTotal: false,
    }
    upsert(account)
    members.value = [
      ...members.value,
      {
        accountId: id,
        userId,
        displayName: session.user?.displayName || 'Участник',
        joinedAt: new Date().toISOString(),
      },
    ]
    if (input.categoryIds?.length) {
      useCategoryStore().bindAccounts(id, input.categoryIds)
    }
    await enqueueMutation(
      userId,
      'createAccount',
      {
        id,
        name: input.name,
        openingAmount: input.openingAmount,
        ...(input.categoryIds ? { categoryIds: input.categoryIds } : {}),
      },
      id,
    )
    return account
  }

  async function addByCode(code: string) {
    assertOnline()
    assertWritable()
    const account = await joinAccount(code)
    await load()
    return account
  }

  async function enableShare(accountId: string) {
    assertOnline()
    assertWritable()
    const account = await shareAccount(accountId)
    upsert(account)
    return account
  }

  async function saveAccount(
    id: string,
    userId: string,
    patch: { name?: string; amount?: number; excludeFromTotal?: boolean },
  ) {
    assertWritable()
    const current = getById(id)
    if (!current) {
      throw new Error('Счёт не найден')
    }
    const accountPatch: { name?: string; excludeFromTotal?: boolean } = {}
    if (patch.name != null) {
      accountPatch.name = patch.name.trim()
      upsert({ ...getById(id)!, name: patch.name.trim() })
    }
    if (patch.excludeFromTotal != null) {
      accountPatch.excludeFromTotal = patch.excludeFromTotal
      upsert({ ...getById(id)!, excludeFromTotal: patch.excludeFromTotal })
    }
    if (Object.keys(accountPatch).length) {
      await enqueueMutation(userId, 'updateAccount', { id, userId, ...accountPatch }, id)
    }
    if (patch.amount != null) {
      const latest = getById(id)!
      const delta = Math.round(patch.amount) - latest.amount
      if (delta) {
        applyAmountDelta(id, delta)
        await enqueueMutation(userId, 'adjustAccountBalance', { id, delta }, id)
      }
    }
    return getById(id)!
  }

  async function bindCategories(accountId: string, categoryIds: string[]) {
    assertWritable()
    const userId = requireUserId()
    useCategoryStore().bindAccounts(accountId, categoryIds)
    await enqueueMutation(userId, 'bindAccountCategories', { accountId, categoryIds }, accountId)
  }

  async function transfer(input: {
    fromAccountId: string
    toAccountId: string
    amount: number
    occurredOn: string
    notes?: string
  }) {
    assertWritable()
    const userId = requireUserId()
    const id = createUuid()
    const amount = Math.round(input.amount)
    applyAmountDelta(input.fromAccountId, -amount)
    applyAmountDelta(input.toAccountId, amount)
    await enqueueMutation(
      userId,
      'transfer',
      {
        id,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount,
        occurredOn: input.occurredOn,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      id,
    )
    return {
      id,
      userId,
      amount,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      occurredOn: input.occurredOn,
      notes: input.notes,
    }
  }

  async function deleteAccount(accountId: string) {
    assertOnline()
    assertWritable()
    await deleteAccountRemote(accountId)
    remove(accountId)
  }

  async function leave(accountId: string) {
    await deleteAccount(accountId)
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
    includedTotal,
    total,
    upsert,
    remove,
    applyRemoteRow,
    applyAmountDelta,
    hydrate,
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
    deleteAccount,
    leave,
    reset,
  }
})
