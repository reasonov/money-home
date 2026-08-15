<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppButton, AppInputNumber, confirmAction, getErrorMessage, showToast } from '@/shared'
import { useTransactionStore } from '@/entities/transaction'

const props = defineProps<{
  transactionId: string
}>()

const transactions = useTransactionStore()
const editing = ref(false)
const amount = ref('')
const pending = ref(false)

const occurrence = computed(() => transactions.occurrenceByTransaction(props.transactionId))
const tx = computed(() => transactions.items.find((item) => item.id === props.transactionId))
const canAct = computed(
  () => occurrence.value && tx.value?.status === 'posted' && tx.value.source === 'income_rule',
)

async function skip() {
  const occ = occurrence.value
  if (!occ) return
  const ok = await confirmAction({
    title: 'Отменить пополнение?',
    message: 'Сумма будет списана со счёта. За этот день правило больше не начислит.',
    confirmLabel: 'Отменить',
    danger: true,
  })
  if (!ok) return
  pending.value = true
  try {
    await transactions.skipOccurrence(occ.id)
    showToast('Пополнение отменено')
    editing.value = false
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось отменить'))
  } finally {
    pending.value = false
  }
}

function startEdit() {
  amount.value = String(tx.value?.amount ?? '')
  editing.value = true
}

async function save() {
  const occ = occurrence.value
  const value = Number(amount.value)
  if (!occ || !Number.isFinite(value) || value <= 0) return
  pending.value = true
  try {
    await transactions.adjustOccurrence(occ.id, value)
    showToast('Сумма изменена')
    editing.value = false
  } catch (err) {
    showToast(getErrorMessage(err, 'Не удалось изменить'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div v-if="canAct" class="actions">
    <template v-if="editing">
      <AppInputNumber v-model="amount" :min="1" placeholder="0" />
      <AppButton variant="secondary" :disabled="pending" @click="save">Сохранить</AppButton>
      <AppButton variant="ghost" @click="editing = false">Закрыть</AppButton>
    </template>
    <template v-else>
      <AppButton variant="secondary" :disabled="pending" @click="startEdit">Изменить</AppButton>
      <AppButton variant="ghost" :disabled="pending" @click="skip">Отменить</AppButton>
    </template>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
