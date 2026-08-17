<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AppButton,
  AppEmpty,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  formatMoney,
  getErrorMessage,
  openFormDrawer,
  showToast,
  todayLocal,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useTransactionStore } from '@/entities/transaction'

const props = defineProps<{
  fromAccountId?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const accounts = useAccountStore()
const transactions = useTransactionStore()

const fromId = ref(accounts.getById(props.fromAccountId ?? '')?.id ?? accounts.items[0]?.id ?? '')
const toId = ref(accounts.items.find((item) => item.id !== fromId.value)?.id ?? '')
const amount = ref<string | number>('')
const notes = ref('')
const error = ref('')
const pending = ref(false)

const fromAccount = computed(() => accounts.getById(fromId.value))
const canSubmit = computed(
  () => accounts.items.length > 1 && fromId.value && toId.value && fromId.value !== toId.value,
)

watch(fromId, (id) => {
  if (toId.value === id) {
    toId.value = accounts.items.find((item) => item.id !== id)?.id ?? ''
  }
})

function swap() {
  const previous = fromId.value
  fromId.value = toId.value
  toId.value = previous
}

async function onSubmit() {
  error.value = ''
  const value = Number(amount.value)
  if (fromId.value === toId.value) {
    error.value = 'Выберите разные счета'
    return
  }
  if (!Number.isFinite(value) || value <= 0) {
    error.value = 'Укажите сумму больше 0 ₽'
    return
  }
  if (fromAccount.value && value > fromAccount.value.amount) {
    error.value = `Недостаточно средств. Доступно: ${formatMoney(fromAccount.value.amount)}`
    return
  }
  pending.value = true
  try {
    await accounts.transfer({
      fromAccountId: fromId.value,
      toAccountId: toId.value,
      amount: value,
      occurredOn: todayLocal(),
      notes: notes.value,
    })
    await transactions.load()
    showToast('Перевод выполнен')
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось перевести')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppEmpty v-if="accounts.items.length < 2" description="Для перевода нужно минимум два счёта">
    <AppButton block @click="openFormDrawer({ name: 'account' })">Добавить счёт</AppButton>
  </AppEmpty>

  <form v-else class="form" @submit.prevent="onSubmit">
    <AppField label="Сумма, ₽" for-id="tr-amount">
      <AppInputNumber id="tr-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <p v-if="fromAccount" class="hint">
      На счёте «{{ fromAccount.name }}»: {{ formatMoney(fromAccount.amount) }}
    </p>
    <AppField label="Откуда" for-id="tr-from">
      <AppSelect id="tr-from" v-model="fromId">
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppButton type="button" variant="ghost" block @click="swap">Поменять местами</AppButton>
    <AppField label="Куда" for-id="tr-to">
      <AppSelect id="tr-to" v-model="toId">
        <option
          v-for="account in accounts.items.filter((item) => item.id !== fromId)"
          :key="'to-' + account.id"
          :value="account.id"
        >
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Комментарий" for-id="tr-notes">
      <AppInput id="tr-notes" v-model="notes" />
    </AppField>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending || !canSubmit">
      {{ pending ? 'Переводим…' : 'Перевести' }}
    </AppButton>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hint {
  margin: calc(var(--space-3) * -1) 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}
</style>
