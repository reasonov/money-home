<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppButton, AppInputNumber, confirmAction, getErrorMessage, showToast } from '@/shared'
import { useTransactionStore } from '@/entities/transaction'

const props = withDefaults(
  defineProps<{
    transactionId: string
    kind?: 'income' | 'expense' | 'transfer'
  }>(),
  { kind: 'income' },
)

const transactions = useTransactionStore()
const editing = ref(false)
const amount = ref('')
const pending = ref(false)

const occurrence = computed(() => transactions.occurrenceByTransaction(props.transactionId))
const tx = computed(() => transactions.items.find((item) => item.id === props.transactionId))
const source = computed(() =>
  props.kind === 'expense'
    ? 'expense_rule'
    : props.kind === 'transfer'
      ? 'transfer_rule'
      : 'income_rule',
)
const canAct = computed(
  () => occurrence.value && tx.value?.status === 'posted' && tx.value.source === source.value,
)

async function skip() {
  const occ = occurrence.value
  if (!occ) return
  const ok = await confirmAction({
    title:
      props.kind === 'expense'
        ? 'Отменить расход?'
        : props.kind === 'transfer'
          ? 'Отменить перевод?'
          : 'Отменить пополнение?',
    message:
      props.kind === 'expense'
        ? 'Сумма вернётся на счёт. Этот регулярный расход больше не будет списан за эту дату.'
        : props.kind === 'transfer'
          ? 'Сумма вернётся на исходный счёт и спишется у получателя. Этот регулярный перевод больше не будет выполнен за эту дату.'
          : 'Сумма будет списана со счёта. Это пополнение больше не будет зачислено за эту дату.',
    confirmLabel: 'Отменить',
    danger: true,
  })
  if (!ok) return
  pending.value = true
  try {
    await transactions.skipOccurrence(occ.id)
    showToast(
      props.kind === 'expense'
        ? 'Расход отменён'
        : props.kind === 'transfer'
          ? 'Перевод отменён'
          : 'Пополнение отменено',
    )
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
    showToast('Сумма операции изменена только на эту дату')
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
      <AppInputNumber v-model="amount" :min="1" placeholder="Новая сумма" aria-label="Новая сумма" />
      <AppButton variant="ghost" @click="editing = false">Закрыть</AppButton>
      <AppButton variant="secondary" :disabled="pending" @click="save">Сохранить</AppButton>
    </template>
    <template v-else>
      <AppButton variant="ghost" :disabled="pending" @click="skip">Отменить операцию</AppButton>
      <AppButton variant="secondary" :disabled="pending" @click="startEdit">Изменить сумму</AppButton>
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
