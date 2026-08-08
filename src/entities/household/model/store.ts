import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createHousehold as createHouseholdApi,
  fetchCurrentMembership,
  joinHousehold as joinHouseholdApi,
} from '../api/householdApi'
import type { HouseholdMember } from './member'
import type { Household } from './types'

export const useHouseholdStore = defineStore('household', () => {
  const household = ref<Household | null>(null)
  const members = ref<HouseholdMember[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const hasHousehold = computed(() => household.value != null)
  const inviteCode = computed(() => household.value?.inviteCode ?? '')

  function memberName(userId: string | null | undefined): string {
    if (!userId) {
      return 'Участник'
    }
    return members.value.find((item) => item.userId === userId)?.displayName ?? 'Участник'
  }

  function setHouseholdData(next: Household, nextMembers: HouseholdMember[]) {
    household.value = next
    members.value = nextMembers
    loaded.value = true
  }

  async function loadCurrent() {
    loading.value = true
    try {
      const result = await fetchCurrentMembership()
      if (!result) {
        household.value = null
        members.value = []
        loaded.value = true
        return null
      }
      setHouseholdData(result.household, result.members)
      return result.household
    } finally {
      loading.value = false
    }
  }

  async function createHousehold(name: string) {
    const created = await createHouseholdApi(name)
    await loadCurrent()
    return created
  }

  async function joinHousehold(code: string) {
    const joined = await joinHouseholdApi(code)
    await loadCurrent()
    return joined
  }

  function clearHousehold() {
    household.value = null
    members.value = []
    loaded.value = false
  }

  return {
    household,
    members,
    loading,
    loaded,
    hasHousehold,
    inviteCode,
    memberName,
    setHouseholdData,
    loadCurrent,
    createHousehold,
    joinHousehold,
    clearHousehold,
  }
})
