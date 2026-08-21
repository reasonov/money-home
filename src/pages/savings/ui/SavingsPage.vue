<script setup lang="ts">
import { computed } from 'vue'
import { AppButton, AppEmpty, openFormDrawer } from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useSavingsGoalStore } from '@/entities/savings-goal'
import { SavingsGoals } from '@/widgets/savings-goals'

const accounts = useAccountStore()
const goals = useSavingsGoalStore()

const isAll = computed(() => accounts.selectedAccountId === ALL_ACCOUNTS_ID)

const visibleAccounts = computed(() => {
  if (isAll.value) {
    return accounts.items
  }
  const current = accounts.selectedAccount
  return current ? [current] : []
})

const hasGoals = computed(() =>
  visibleAccounts.value.some((account) => goals.activeFor(account.id).length > 0),
)

const listedAccounts = computed(() =>
  visibleAccounts.value.filter((account) => goals.activeFor(account.id).length > 0),
)

function openCreate() {
  if (!accounts.items.length) {
    openFormDrawer({ name: 'account' })
    return
  }
  const accountId = isAll.value ? accounts.preferredAccountId : accounts.selectedAccountId
  openFormDrawer({ name: 'savings-goal', accountId })
}
</script>

<template>
  <AppEmpty
    v-if="!accounts.items.length"
    description="Сначала создайте счёт — копилка привязывается к нему"
  >
    <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
  </AppEmpty>

  <div v-else class="page">
    <AppEmpty v-if="!hasGoals" description="Пока нет копилок. Задайте сумму и дату — подскажем, сколько вносить">
      <AppButton block @click="openCreate">Копить</AppButton>
    </AppEmpty>

    <template v-else>
      <SavingsGoals
        v-for="account in listedAccounts"
        :key="account.id"
        :account-id="account.id"
        :heading="isAll ? account.name : ''"
      />
      <AppButton variant="secondary" block @click="openCreate">Копить</AppButton>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
