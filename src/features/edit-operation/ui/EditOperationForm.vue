<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from '@lucide/vue'
import {
  AppButton,
  AppDrawer,
  AppEmpty,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  AppTextarea,
  confirmAction,
  formatMoney,
  getErrorMessage,
  showToast,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import {
  CategoryForm,
  CategorySelect,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'
import { useTransactionStore } from '@/entities/transaction'

const props = defineProps<{
  transactionId: string
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const accounts = useAccountStore()
const categories = useCategoryStore()
const transactions = useTransactionStore()

const ready = ref(false)
const pending = ref(false)
const error = ref('')
const createOpen = ref(false)

const kind = ref<CategoryKind | 'transfer'>('expense')
const source = ref('')
const accountId = ref('')
const toAccountId = ref('')
const categoryId = ref('')
const amount = ref<string | number>('')
const occurredOn = ref('')
const title = ref('')
const notes = ref('')
const originalAmount = ref(0)
const originalFromId = ref('')

const isTransfer = computed(() => kind.value === 'transfer')
const isIncomeRule = computed(() => source.value === 'income_rule')
const categoryKind = computed<CategoryKind>(() => (kind.value === 'income' ? 'income' : 'expense'))
const availableCats = computed(() =>
  isTransfer.value ? [] : categories.forAccount(accountId.value, categoryKind.value),
)
const fromAccount = computed(() => accounts.getById(accountId.value))
const transferAvailable = computed(() => {
  if (!fromAccount.value) {
    return 0
  }
  const extra = originalFromId.value === accountId.value ? originalAmount.value : 0
  return fromAccount.value.amount + extra
})

onMounted(() => {
  const tx = transactions.getById(props.transactionId)
  if (!tx || tx.status !== 'posted') {
    emit('cancel')
    return
  }
  kind.value = tx.kind === 'transfer' ? 'transfer' : tx.kind
  source.value = tx.source
  accountId.value = tx.accountId
  toAccountId.value = tx.counterpartyAccountId ?? ''
  categoryId.value = tx.categoryId ?? ''
  amount.value = tx.amount
  occurredOn.value = tx.occurredOn
  title.value = tx.title ?? ''
  notes.value = tx.notes ?? ''
  originalAmount.value = tx.amount
  originalFromId.value = tx.accountId
  ready.value = true
})

watch(
  availableCats,
  (list) => {
    if (!ready.value || isTransfer.value) {
      return
    }
    if (!list.some((item) => item.id === categoryId.value)) {
      categoryId.value = list[0]?.id ?? ''
    }
  },
)

watch(accountId, (id) => {
  if (isTransfer.value && toAccountId.value === id) {
    toAccountId.value = accounts.items.find((item) => item.id !== id)?.id ?? ''
  }
})

function onCategoryCreated(category: Category) {
  categoryId.value = category.id
  createOpen.value = false
}

function swap() {
  const previous = accountId.value
  accountId.value = toAccountId.value
  toAccountId.value = previous
}

async function onSubmit() {
  error.value = ''
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    error.value = 'Укажите сумму'
    return
  }
  if (isTransfer.value) {
    if (!accountId.value || !toAccountId.value || accountId.value === toAccountId.value) {
      error.value = 'Выберите разные счета'
      return
    }
    if (value > transferAvailable.value) {
      error.value = `На счёте ${formatMoney(transferAvailable.value)}`
      return
    }
  } else if (!accountId.value || !categoryId.value) {
    error.value = 'Выберите счёт и категорию'
    return
  }

  pending.value = true
  try {
    await transactions.updatePosted({
      id: props.transactionId,
      accountId: accountId.value,
      amount: value,
      occurredOn: occurredOn.value,
      counterpartyAccountId: isTransfer.value ? toAccountId.value : undefined,
      categoryId: isTransfer.value ? undefined : categoryId.value,
      title: title.value,
      notes: notes.value,
    })
    showToast('Операция сохранена')
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    pending.value = false
  }
}

async function onDelete() {
  const ok = await confirmAction({
    title: isIncomeRule.value
      ? 'Отменить пополнение?'
      : isTransfer.value
        ? 'Удалить перевод?'
        : 'Удалить операцию?',
    message: isIncomeRule.value
      ? 'Сумма будет списана со счёта. За этот день правило больше не начислит.'
      : isTransfer.value
        ? 'Суммы вернутся на счета.'
        : 'Сумма вернётся на счёт.',
    confirmLabel: isIncomeRule.value ? 'Отменить' : 'Удалить',
    danger: true,
  })
  if (!ok) {
    return
  }
  pending.value = true
  try {
    await transactions.cancelPosted(props.transactionId)
    showToast(isIncomeRule.value ? 'Пополнение отменено' : 'Операция удалена')
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppEmpty v-if="ready && !accounts.items.length" description="Сначала создайте счёт" />

  <form v-else-if="ready" class="form" @submit.prevent="onSubmit">
    <p v-if="isIncomeRule" class="hint">Авто-пополнение — счёт и дата не меняются</p>

    <AppField label="Сумма, ₽" for-id="edit-amount">
      <AppInputNumber id="edit-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>

    <template v-if="isTransfer">
      <p v-if="fromAccount" class="hint">
        На счёте «{{ fromAccount.name }}»: {{ formatMoney(transferAvailable) }}
      </p>
      <AppField label="Откуда" for-id="edit-from">
        <AppSelect id="edit-from" v-model="accountId">
          <option v-for="account in accounts.items" :key="account.id" :value="account.id">
            {{ account.name }} · {{ formatMoney(account.amount) }}
          </option>
        </AppSelect>
      </AppField>
      <AppButton type="button" variant="ghost" block @click="swap">Поменять местами</AppButton>
      <AppField label="Куда" for-id="edit-to">
        <AppSelect id="edit-to" v-model="toAccountId">
          <option
            v-for="account in accounts.items.filter((item) => item.id !== accountId)"
            :key="'to-' + account.id"
            :value="account.id"
          >
            {{ account.name }} · {{ formatMoney(account.amount) }}
          </option>
        </AppSelect>
      </AppField>
    </template>

    <AppField v-else label="Счёт" for-id="edit-account">
      <AppSelect id="edit-account" v-model="accountId" :disabled="isIncomeRule" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>

    <template v-if="!isTransfer">
      <AppField label="Категория" for-id="edit-cat">
        <div class="cat">
          <CategorySelect id="edit-cat" v-model="categoryId" :categories="availableCats" required />
          <AppButton
            type="button"
            class="cat__add"
            aria-label="Новая категория"
            @click="createOpen = true"
          >
            <Plus :size="20" :stroke-width="2.2" />
          </AppButton>
        </div>
      </AppField>
      <AppEmpty v-if="!availableCats.length" description="Нет категорий для этого счёта">
        <AppButton variant="secondary" block @click="createOpen = true">Добавить категорию</AppButton>
      </AppEmpty>
    </template>

    <AppField label="Дата" for-id="edit-date">
      <AppInput id="edit-date" v-model="occurredOn" type="date" :disabled="isIncomeRule" required />
    </AppField>
    <AppField v-if="!isTransfer" label="Название" for-id="edit-title">
      <AppInput id="edit-title" v-model="title" />
    </AppField>
    <AppField label="Комментарий" for-id="edit-notes">
      <AppTextarea v-if="!isTransfer" id="edit-notes" v-model="notes" />
      <AppInput v-else id="edit-notes" v-model="notes" />
    </AppField>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending || (!isTransfer && !availableCats.length)">
      {{ pending ? 'Сохраняем…' : 'Сохранить' }}
    </AppButton>
    <AppButton type="button" variant="danger" block :disabled="pending" @click="onDelete">
      {{ isIncomeRule ? 'Отменить пополнение' : 'Удалить' }}
    </AppButton>
  </form>

  <AppDrawer v-model:open="createOpen" title="Новая категория" height="90%">
    <CategoryForm
      v-if="createOpen && !isTransfer"
      :accounts="accounts.items"
      :locked-kind="categoryKind"
      @saved="onCategoryCreated"
      @cancel="createOpen = false"
    />
  </AppDrawer>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.cat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.cat :deep(.app-select) {
  flex: 1;
  min-width: 0;
}

.cat :deep(.cat__add) {
  flex-shrink: 0;
  width: 44px;
  min-width: 44px;
  padding-left: 0;
  padding-right: 0;
}

.error {
  font-size: 0.875rem;
  color: var(--color-danger);
}
</style>
