import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchBalance, updateBalance } from '../api/balanceApi'

export const useBalanceStore = defineStore('balance', () => {
  const amount = ref(0)
  const householdId = ref<string | null>(null)

  function applyRemote(value: number) {
    amount.value = Math.round(value)
  }

  async function load(nextHouseholdId: string) {
    householdId.value = nextHouseholdId
    amount.value = await fetchBalance(nextHouseholdId)
  }

  async function setBalance(value: number, userId: string) {
    if (!householdId.value) {
      throw new Error('Семья не загружена')
    }
    amount.value = await updateBalance(householdId.value, value, userId)
  }

  function reset() {
    amount.value = 0
    householdId.value = null
  }

  return {
    amount,
    householdId,
    applyRemote,
    load,
    setBalance,
    reset,
  }
})
