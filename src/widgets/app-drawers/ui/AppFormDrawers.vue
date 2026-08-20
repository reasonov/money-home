<script setup lang="ts">
import { computed } from 'vue'
import { AppDrawer, closeFormDrawer, formDrawer, formDrawerOpen } from '@/shared'
import { OperationForm } from '@/features/add-operation'
import { AccountForm } from '@/features/add-account'
import { TransferForm } from '@/features/add-transfer'
import { AddPurchaseForm } from '@/features/add-purchase'
import { EditPurchaseForm } from '@/features/edit-purchase'
import { IncomeRuleForm } from '@/features/manage-income'
import { ExpenseRuleForm } from '@/features/manage-expense'
import { EditOperationForm } from '@/features/edit-operation'
import { offerRepeatSuggestion } from '@/features/suggest-repeat'
import type { Transaction } from '@/entities/transaction'

const open = formDrawerOpen

const title = computed(() => {
  const current = formDrawer.value
  if (!current) {
    return ''
  }
  switch (current.name) {
    case 'expense':
      return 'Расход'
    case 'income':
      return 'Доход'
    case 'transfer':
      return 'Перевод'
    case 'account':
      return 'Новый счёт'
    case 'purchase-new':
      return 'Новая покупка'
    case 'purchase-edit':
      return 'Изменить покупку'
    case 'income-rule':
      return current.ruleId ? 'Изменить регулярное пополнение' : 'Регулярное пополнение'
    case 'expense-rule':
      return current.ruleId ? 'Изменить регулярный расход' : 'Регулярный расход'
    case 'transaction-edit':
      return 'Изменить операцию'
    default:
      return ''
  }
})

const ruleFormKey = computed(() => {
  const current = formDrawer.value
  if (!current || (current.name !== 'income-rule' && current.name !== 'expense-rule')) {
    return 'rule'
  }
  return current.ruleId ?? JSON.stringify(current.draft) ?? 'new'
})

async function onOperationSaved(tx: Transaction) {
  closeFormDrawer()
  await offerRepeatSuggestion(tx)
}
</script>

<template>
  <AppDrawer v-model:open="open" :title="title" height="90%">
    <OperationForm
      v-if="formDrawer?.name === 'expense'"
      kind="expense"
      :account-id="formDrawer.accountId"
      @saved="onOperationSaved"
    />
    <OperationForm
      v-else-if="formDrawer?.name === 'income'"
      kind="income"
      :account-id="formDrawer.accountId"
      @saved="onOperationSaved"
    />
    <TransferForm
      v-else-if="formDrawer?.name === 'transfer'"
      :from-account-id="formDrawer.fromAccountId"
      @saved="closeFormDrawer"
    />
    <AccountForm
      v-else-if="formDrawer?.name === 'account'"
      :initial-mode="formDrawer.mode"
      @saved="closeFormDrawer"
    />
    <AddPurchaseForm
      v-else-if="formDrawer?.name === 'purchase-new'"
      :planned-date="formDrawer.plannedDate"
      @saved="closeFormDrawer"
    />
    <EditPurchaseForm
      v-else-if="formDrawer?.name === 'purchase-edit'"
      :purchase-id="formDrawer.purchaseId"
      @saved="closeFormDrawer"
      @cancel="closeFormDrawer"
    />
    <IncomeRuleForm
      v-else-if="formDrawer?.name === 'income-rule'"
      :key="ruleFormKey"
      :rule-id="formDrawer.ruleId"
      :account-id="formDrawer.accountId"
      :draft="formDrawer.draft"
      @saved="closeFormDrawer"
    />
    <ExpenseRuleForm
      v-else-if="formDrawer?.name === 'expense-rule'"
      :key="ruleFormKey"
      :rule-id="formDrawer.ruleId"
      :account-id="formDrawer.accountId"
      :draft="formDrawer.draft"
      @saved="closeFormDrawer"
    />
    <EditOperationForm
      v-else-if="formDrawer?.name === 'transaction-edit'"
      :key="formDrawer.transactionId"
      :transaction-id="formDrawer.transactionId"
      @saved="closeFormDrawer"
      @cancel="closeFormDrawer"
    />
  </AppDrawer>
</template>
