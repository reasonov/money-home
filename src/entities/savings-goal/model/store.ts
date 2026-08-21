import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { assertWritable, createUuid, enqueueMutation, roundMoney } from '@/shared'
import {
  fetchSavingsGoals,
  mapSavingsGoal,
  type SavingsGoalRow,
} from '../api/savingsGoalApi'
import type { SavingsGoal, SavingsGoalStatus } from './types'

export const useSavingsGoalStore = defineStore('savings-goal', () => {
  const items = ref<SavingsGoal[]>([])

  const active = computed(() => items.value.filter((item) => item.status === 'active'))

  function upsert(goal: SavingsGoal) {
    const index = items.value.findIndex((item) => item.id === goal.id)
    if (index === -1) {
      items.value = [...items.value, goal]
      return
    }
    const next = [...items.value]
    next[index] = goal
    items.value = next
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function applyRemoteRow(row: SavingsGoalRow) {
    upsert(mapSavingsGoal(row))
  }

  function hydrate(next: SavingsGoal[]) {
    items.value = next
  }

  function activeFor(accountId: string) {
    return active.value
      .filter((item) => item.accountId === accountId)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.title.localeCompare(b.title, 'ru'))
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  async function load() {
    items.value = await fetchSavingsGoals()
  }

  async function addGoal(input: {
    accountId: string
    title: string
    targetAmount: number
    targetDate: string
    savedAmount: number
    startedOn: string
    createdBy: string
  }) {
    assertWritable()
    const id = createUuid()
    const goal: SavingsGoal = {
      id,
      accountId: input.accountId,
      title: input.title.trim(),
      targetAmount: roundMoney(input.targetAmount),
      targetDate: input.targetDate,
      savedAmount: roundMoney(input.savedAmount),
      startedOn: input.startedOn,
      status: 'active',
      createdBy: input.createdBy,
    }
    upsert(goal)
    await enqueueMutation(input.createdBy, 'insertSavingsGoal', { ...input, id }, id)
    return goal
  }

  async function updateGoal(
    id: string,
    userId: string,
    input: {
      title?: string
      targetAmount?: number
      targetDate?: string
      savedAmount?: number
      status?: SavingsGoalStatus
    },
  ) {
    assertWritable()
    const current = getById(id)
    if (!current || current.status !== 'active') {
      throw new Error('Копилка уже завершена или удалена')
    }
    const goal: SavingsGoal = {
      ...current,
      ...input,
      ...(input.title != null ? { title: input.title.trim() } : {}),
      ...(input.targetAmount != null ? { targetAmount: roundMoney(input.targetAmount) } : {}),
      ...(input.savedAmount != null ? { savedAmount: roundMoney(input.savedAmount) } : {}),
    }
    upsert(goal)
    await enqueueMutation(userId, 'updateSavingsGoal', { id, userId, input }, id)
    return goal
  }

  async function completeGoal(id: string, userId: string) {
    return updateGoal(id, userId, { status: 'completed' })
  }

  async function removeGoal(id: string, userId: string) {
    assertWritable()
    const current = getById(id)
    if (!current) {
      throw new Error('Копилка не найдена')
    }
    remove(id)
    await enqueueMutation(userId, 'deleteSavingsGoal', { id, userId }, id)
  }

  function reset() {
    items.value = []
  }

  return {
    items,
    active,
    upsert,
    remove,
    applyRemoteRow,
    hydrate,
    activeFor,
    getById,
    load,
    addGoal,
    updateGoal,
    completeGoal,
    removeGoal,
    reset,
  }
})
