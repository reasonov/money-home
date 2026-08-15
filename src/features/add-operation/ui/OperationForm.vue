<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  loadLastCategoryId,
  saveLastCategoryId,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'

const props = defineProps<{
  kind: CategoryKind
  accountId?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const session = useSessionStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const transactions = useTransactionStore()

const accountId = ref(
  accounts.getById(props.accountId ?? '')?.id ?? accounts.preferredAccountId,
)
const categoryId = ref('')
const amount = ref<string | number>('')
const occurredOn = ref(todayLocal())
const title = ref('')
const notes = ref('')
const error = ref('')
const pending = ref(false)
const createOpen = ref(false)

const availableCats = computed(() => categories.forAccount(accountId.value, props.kind))

function pickDefaultCategory(list: Category[]) {
  const last = loadLastCategoryId(props.kind)
  if (last && list.some((item) => item.id === last)) {
    return last
  }
  return list[0]?.id ?? ''
}

watch(
  availableCats,
  (list) => {
    if (!list.some((item) => item.id === categoryId.value)) {
      categoryId.value = pickDefaultCategory(list)
    }
  },
  { immediate: true },
)

watch(categoryId, (id) => {
  if (id) {
    saveLastCategoryId(props.kind, id)
  }
})

function onCategoryCreated(category: Category) {
  saveLastCategoryId(props.kind, category.id)
  categoryId.value = category.id
  createOpen.value = false
}

async function onSubmit() {
  error.value = ''
  const value = Number(amount.value)
  const category = categories.getById(categoryId.value)
  if (!accountId.value || !category || !Number.isFinite(value) || value <= 0) {
    error.value = 'Выберите счёт, категорию и сумму'
    return
  }
  pending.value = true
  try {
    await transactions.addManual({
      accountId: accountId.value,
      kind: props.kind,
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      title: title.value || category.name,
      amount: value,
      occurredOn: occurredOn.value,
      notes: notes.value,
      createdBy: session.user!.id,
    })
    saveLastCategoryId(props.kind, category.id)
    await accounts.load()
    showToast(props.kind === 'expense' ? 'Расход сохранён' : 'Доход сохранён')
    emit('saved')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppEmpty v-if="!accounts.items.length" description="Сначала создайте счёт">
    <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
  </AppEmpty>

  <form v-else class="form" :data-tour="kind === 'expense' ? 'expense-form' : 'income-form'" @submit.prevent="onSubmit">
    <AppField label="Сумма, ₽" for-id="op-amount">
      <AppInputNumber id="op-amount" v-model="amount" :min="1" placeholder="0" />
    </AppField>
    <AppField label="Счёт" for-id="op-account">
      <AppSelect id="op-account" v-model="accountId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Категория" for-id="op-cat">
      <div class="cat">
        <CategorySelect id="op-cat" v-model="categoryId" :categories="availableCats" required />
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
    <AppField label="Дата" for-id="op-date">
      <AppInput id="op-date" v-model="occurredOn" type="date" required />
    </AppField>
    <AppField label="Название" for-id="op-title">
      <AppInput id="op-title" v-model="title" :placeholder="props.kind === 'expense' ? 'Магазин' : 'Зарплата'" />
    </AppField>
    <AppField label="Комментарий" for-id="op-notes">
      <AppTextarea id="op-notes" v-model="notes" />
    </AppField>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <AppButton type="submit" block :disabled="pending || !availableCats.length">
      {{ pending ? 'Сохраняем…' : 'Сохранить' }}
    </AppButton>
  </form>

  <AppDrawer v-model:open="createOpen" title="Новая категория" height="90%">
    <CategoryForm
      v-if="createOpen"
      :accounts="accounts.items"
      :locked-kind="kind"
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
