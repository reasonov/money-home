<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bookmark, Plus } from '@lucide/vue'
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
  openFormDrawer,
  showToast,
  todayLocal,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import {
  CategoryForm,
  CategorySelect,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'
import { findMatchingTemplate, useOperationTemplateStore } from '@/entities/operation-template'
import { useSessionStore } from '@/entities/session'
import { ruleDraftFromOperation, useTransactionStore, type Transaction } from '@/entities/transaction'

const props = defineProps<{
  transactionId: string
}>()

const emit = defineEmits<{
  saved: []
  repeated: [tx: Transaction]
  cancel: []
}>()

const session = useSessionStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const transactions = useTransactionStore()
const templates = useOperationTemplateStore()

const ready = ref(false)
const pending = ref(false)
const error = ref('')
const createOpen = ref(false)
const savingTemplate = ref(false)

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
const isAutoRule = computed(() => source.value === 'income_rule' || source.value === 'expense_rule')
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

const canSaveTemplate = computed(() => {
  const value = Number(amount.value)
  return Boolean(categoryId.value && Number.isFinite(value) && value > 0)
})

const matchingTemplate = computed(() => {
  if (isTransfer.value || !canSaveTemplate.value) {
    return null
  }
  return (
    findMatchingTemplate(templates.items, {
      kind: categoryKind.value,
      categoryId: categoryId.value,
      amount: Number(amount.value),
      title: title.value,
      notes: notes.value,
    }) ?? null
  )
})

const inFavorites = computed(() => Boolean(matchingTemplate.value))

async function toggleCurrentTemplate() {
  if (!canSaveTemplate.value || savingTemplate.value || isTransfer.value) {
    return
  }
  const existing = matchingTemplate.value
  savingTemplate.value = true
  try {
    if (existing) {
      await templates.remove(existing.id)
      showToast('Удалено из избранного')
    } else {
      await templates.save({
        kind: categoryKind.value,
        categoryId: categoryId.value,
        amount: Number(amount.value),
        title: title.value,
        notes: notes.value,
      })
      showToast('Добавлено в избранное')
    }
  } catch (err) {
    showToast(
      getErrorMessage(err, existing ? 'Не удалось удалить избранное' : 'Не удалось сохранить избранное'),
    )
  } finally {
    savingTemplate.value = false
  }
}

function makeRegular() {
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0 || !accountId.value) {
    error.value = 'Укажите сумму'
    return
  }
  openFormDrawer({
    name: kind.value === 'income' ? 'income-rule' : 'expense-rule',
    accountId: accountId.value,
    draft: ruleDraftFromOperation({
      accountId: accountId.value,
      amount: value,
      occurredOn: occurredOn.value,
      title: title.value,
      categoryId: categoryId.value,
    }),
  })
}

async function repeatToday() {
  error.value = ''
  if (isTransfer.value) {
    return
  }
  const value = Number(amount.value)
  const category = categories.getById(categoryId.value)
  const userId = session.user?.id
  if (!userId || !accountId.value || !category || !Number.isFinite(value) || value <= 0) {
    error.value = 'Выберите счёт и категорию, затем укажите сумму больше 0 ₽'
    return
  }
  pending.value = true
  try {
    const created = await transactions.addManual({
      accountId: accountId.value,
      kind: categoryKind.value,
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      title: title.value || category.name,
      amount: value,
      occurredOn: todayLocal(),
      notes: notes.value,
      createdBy: userId,
    })
    showToast(categoryKind.value === 'expense' ? 'Расход сохранён' : 'Доход сохранён')
    emit('repeated', created)
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    pending.value = false
  }
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
      error.value = `Недостаточно средств. Доступно: ${formatMoney(transferAvailable.value)}`
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
  const isExpenseRule = source.value === 'expense_rule'
  const ok = await confirmAction({
    title: isAutoRule.value
      ? isExpenseRule
        ? 'Отменить расход?'
        : 'Отменить пополнение?'
      : isTransfer.value
        ? 'Удалить перевод?'
        : 'Удалить операцию?',
    message: isAutoRule.value
      ? isExpenseRule
        ? 'Сумма вернётся на счёт. Этот регулярный расход больше не будет списан за эту дату.'
        : 'Сумма будет списана со счёта. Это пополнение больше не будет зачислено за эту дату.'
      : isTransfer.value
        ? 'Суммы вернутся на счета.'
        : 'Сумма вернётся на счёт.',
    confirmLabel: isAutoRule.value ? 'Отменить' : 'Удалить',
    danger: true,
  })
  if (!ok) {
    return
  }
  pending.value = true
  try {
    await transactions.cancelPosted(props.transactionId)
    showToast(
      isAutoRule.value
        ? isExpenseRule
          ? 'Расход отменён'
          : 'Пополнение отменено'
        : 'Операция удалена',
    )
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
    <p v-if="isAutoRule" class="hint">
      {{ source === 'expense_rule' ? 'Регулярный расход' : 'Регулярное пополнение' }}: можно изменить только сумму
    </p>

    <div v-if="!isTransfer" class="form__actions">
      <AppButton
        v-if="!isAutoRule"
        type="button"
        variant="secondary"
        class="form__rule"
        @click="makeRegular"
      >
        Сделать регулярной
      </AppButton>
      <AppButton
        type="button"
        class="form__fav-add"
        :aria-label="inFavorites ? 'Удалить из избранного' : 'Добавить в избранное'"
        :aria-pressed="inFavorites"
        :disabled="!canSaveTemplate || savingTemplate"
        @click="toggleCurrentTemplate"
      >
        <Bookmark :size="20" :stroke-width="2.2" :fill="inFavorites ? 'currentColor' : 'none'" />
      </AppButton>
    </div>

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
      <AppSelect id="edit-account" v-model="accountId" :disabled="isAutoRule" required>
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
      <AppInput id="edit-date" v-model="occurredOn" type="date" :disabled="isAutoRule" required />
    </AppField>
    <AppField v-if="!isTransfer" label="Название" for-id="edit-title">
      <AppInput id="edit-title" v-model="title" />
    </AppField>
    <AppField label="Комментарий" for-id="edit-notes">
      <AppTextarea v-if="!isTransfer" id="edit-notes" v-model="notes" />
      <AppInput v-else id="edit-notes" v-model="notes" />
    </AppField>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="form__submit">
      <AppButton type="submit" block :disabled="pending || (!isTransfer && !availableCats.length)">
        {{ pending ? 'Сохраняем…' : 'Сохранить' }}
      </AppButton>
      <AppButton type="button" variant="danger" block :disabled="pending" @click="onDelete">
        {{
          isAutoRule
            ? source === 'expense_rule'
              ? 'Отменить расход'
              : 'Отменить пополнение'
            : 'Удалить'
        }}
      </AppButton>
    </div>
    <AppButton
      v-if="!isTransfer"
      type="button"
      variant="secondary"
      block
      :disabled="pending || !availableCats.length"
      @click="repeatToday"
    >
      Повторить
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

.form__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.form__actions :deep(.form__rule) {
  flex: 1;
  min-width: 0;
}

.form__actions :deep(.form__fav-add) {
  flex-shrink: 0;
  margin-left: auto;
  width: 44px;
  min-width: 44px;
  padding-left: 0;
  padding-right: 0;
}

.form__submit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
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

.cat :deep(.cat-select) {
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
