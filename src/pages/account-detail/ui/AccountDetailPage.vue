<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AppButton,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  AppTag,
  confirmAction,
  formatMoney,
  getErrorMessage,
  openFormDrawer,
  showToast,
} from '@/shared'
import { useCategoryStore } from '@/entities/category'
import { useAccountStore } from '@/entities/account'
import { useSessionStore } from '@/entities/session'
import { AccountAvailableHint } from '@/widgets/account-available'

const route = useRoute()
const router = useRouter()
const accounts = useAccountStore()
const categories = useCategoryStore()
const session = useSessionStore()

const id = computed(() => String(route.params.id ?? ''))
const account = computed(() => accounts.getById(id.value))
const name = ref('')
const amount = ref<string | number>(0)
const selected = ref<string[]>([])
const error = ref('')
const pending = ref(false)
const settingsOpen = ref(false)

const members = computed(() => accounts.membersOf(id.value))
const isOwner = computed(() => account.value?.ownerId === session.user?.id)
const canTransfer = computed(() => accounts.items.length > 1)

watch(
  [account, () => categories.items],
  ([next]) => {
    if (!next) return
    name.value = next.name
    amount.value = next.amount
    selected.value = categories.forAccount(next.id).map((item) => item.id)
  },
  { immediate: true },
)

async function save() {
  error.value = ''
  const userId = session.user?.id
  if (!userId || !account.value) return
  const value = Number(amount.value)
  if (!name.value.trim() || !Number.isFinite(value)) {
    error.value = 'Проверьте название и баланс'
    return
  }
  pending.value = true
  try {
    await accounts.saveAccount(id.value, userId, { name: name.value, amount: value })
    await accounts.bindCategories(id.value, selected.value)
    await categories.load()
    showToast('Сохранено')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    pending.value = false
  }
}

async function share() {
  try {
    await accounts.enableShare(id.value)
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось поделиться')
  }
}

async function copyCode(code?: string) {
  const value = code ?? account.value?.inviteCode
  if (!value) return
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value)
    showToast('Код скопирован')
  }
}

async function nativeShare() {
  const code = account.value?.inviteCode
  if (!code) return
  if (navigator.share) {
    try {
      await navigator.share({
        title: account.value?.name ?? 'Счёт',
        text: `Код счёта Money Home: ${code}`,
      })
      return
    } catch {
      /* user cancelled */
    }
  }
  await copyCode(code)
}

async function leave() {
  const ok = await confirmAction({
    title: 'Покинуть счёт?',
    message: 'Он исчезнет из вашего списка, но останется у других участников.',
    confirmLabel: 'Покинуть',
    danger: true,
  })
  if (!ok) return
  try {
    await accounts.leave(id.value)
    await router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось покинуть счёт')
  }
}
</script>

<template>
  <div v-if="account" class="page">
    <section class="hero">
      <p class="hero__name">
        <span class="hero__title">{{ account.name }}</span>
        <AppTag v-if="accounts.isShared(account.id)" type="primary">общий</AppTag>
      </p>
      <p class="hero__total">{{ formatMoney(account.amount) }}</p>
      <AccountAvailableHint :account-id="account.id" :balance="account.amount" />
    </section>

    <div class="actions">
      <AppButton block @click="openFormDrawer({ name: 'expense', accountId: account.id })">
        Расход
      </AppButton>
      <AppButton
        variant="secondary"
        block
        @click="openFormDrawer({ name: 'income', accountId: account.id })"
      >
        Доход
      </AppButton>
    </div>
    <AppButton
      v-if="canTransfer"
      variant="ghost"
      block
      @click="openFormDrawer({ name: 'transfer', fromAccountId: account.id })"
    >
      Перевести средства
    </AppButton>

    <section class="block">
      <h2>Участники</h2>
      <p v-for="member in members" :key="member.userId" class="member">
        <span class="member__name">{{ member.displayName }}</span>
        <AppTag v-if="member.userId === session.user?.id" type="info">вы</AppTag>
        <AppTag v-if="member.userId === account.ownerId" type="default">владелец</AppTag>
      </p>
      <div data-tour="account-share">
        <template v-if="account.inviteCode">
          <p class="share-hint">
            Отправьте этот код человеку — он добавит тот же счёт у себя, не копию.
          </p>
          <p class="code">{{ account.inviteCode }}</p>
          <div class="share-actions">
            <AppButton variant="secondary" block @click="copyCode()">Скопировать код</AppButton>
            <AppButton variant="ghost" block @click="nativeShare">Отправить</AppButton>
          </div>
        </template>
        <AppButton v-else variant="secondary" block @click="share">Поделиться счётом</AppButton>
      </div>
      <AppButton v-if="!isOwner" variant="danger" block @click="leave">Покинуть счёт</AppButton>
    </section>

    <section class="block">
      <button type="button" class="settings-toggle" @click="settingsOpen = !settingsOpen">
        {{ settingsOpen ? 'Скрыть настройки' : 'Изменить счёт' }}
      </button>
      <div v-if="settingsOpen" class="settings">
        <p class="share-hint">
          Ручной баланс перезаписывает текущую сумму. Это не расход и не доход.
        </p>
        <AppField label="Название" for-id="d-name">
          <AppInput id="d-name" v-model="name" />
        </AppField>
        <AppField label="Баланс, ₽" for-id="d-amount">
          <AppInputNumber id="d-amount" v-model="amount" :min="0" />
        </AppField>
        <AppField v-if="categories.items.length" label="Категории счёта" for-id="d-cats">
          <AppSelect
            id="d-cats"
            v-model="selected"
            multiple
            filterable
            clearable
            placeholder="Выберите категории"
          >
            <option v-for="cat in categories.items" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </AppSelect>
        </AppField>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <AppButton block :disabled="pending" @click="save">
          {{ pending ? 'Сохраняем…' : 'Сохранить' }}
        </AppButton>
      </div>
    </section>
  </div>
  <p v-else>Счёт не найден</p>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hero,
.block {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.hero__name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  font-weight: 700;
}

.hero__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero__name :deep(.n-tag) {
  flex-shrink: 0;
}

.hero__total {
  margin-top: var(--space-2);
  font-size: 1.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.member {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  min-height: 44px;
}

.member__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member :deep(.n-tag) {
  flex-shrink: 0;
}

.share-hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.code {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.share-actions,
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.settings-toggle {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  font-weight: 700;
  color: var(--color-accent);
  text-align: left;
  cursor: pointer;
}

.error {
  color: var(--color-danger);
}
</style>
