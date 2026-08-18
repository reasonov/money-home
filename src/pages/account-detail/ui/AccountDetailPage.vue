<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AppButton,
  AppField,
  AppInput,
  AppInputNumber,
  AppSelect,
  AppSwitch,
  AppTag,
  confirmAction,
  formatMoney,
  getErrorMessage,
  ONLINE_ONLY_MESSAGE,
  openFormDrawer,
  showToast,
} from '@/shared'
import { useCategoryStore } from '@/entities/category'
import { loadAccountData, useAccountStore } from '@/entities/account'
import { useSessionStore } from '@/entities/session'
import { useSyncStore } from '@/entities/sync'
import { AccountAvailableHint } from '@/widgets/account-available'

const route = useRoute()
const router = useRouter()
const accounts = useAccountStore()
const categories = useCategoryStore()
const session = useSessionStore()
const sync = useSyncStore()

const id = computed(() => String(route.params.id ?? ''))
const account = computed(() => accounts.getById(id.value))
const name = ref('')
const amount = ref<string | number>(0)
const excludeFromTotal = ref(false)
const selected = ref<string[]>([])
const error = ref('')
const pending = ref(false)
const settingsOpen = ref(false)
const excludePending = ref(false)

const members = computed(() => accounts.membersOf(id.value))
const isOwner = computed(() => account.value?.ownerId === session.user?.id)
const canTransfer = computed(() => accounts.items.length > 1)

watch(
  () =>
    account.value && {
      id: account.value.id,
      name: account.value.name,
      amount: account.value.amount,
      excludeFromTotal: account.value.excludeFromTotal,
    },
  (next) => {
    if (!next) return
    name.value = next.name
    amount.value = next.amount
    excludeFromTotal.value = next.excludeFromTotal
  },
  { immediate: true },
)

watch(
  [() => account.value?.id, () => categories.items],
  () => {
    if (!account.value) return
    selected.value = categories.forAccount(account.value.id).map((item) => item.id)
  },
  { immediate: true },
)

function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

async function setExcludeFromTotal(value: boolean) {
  const current = account.value
  const userId = session.user?.id
  if (!current || !userId || excludePending.value) return
  excludeFromTotal.value = value
  if (current.excludeFromTotal === value) return
  excludePending.value = true
  try {
    await accounts.saveAccount(id.value, userId, { excludeFromTotal: value })
  } catch (err) {
    excludeFromTotal.value = current.excludeFromTotal
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    excludePending.value = false
  }
}

async function save() {
  error.value = ''
  const userId = session.user?.id
  if (!userId || !account.value) return
  const value = Number(amount.value)
  if (!name.value.trim() || !Number.isFinite(value)) {
    error.value = 'Укажите название и корректную сумму баланса'
    return
  }
  pending.value = true
  try {
    await accounts.saveAccount(id.value, userId, {
      name: name.value,
      amount: value,
      excludeFromTotal: excludeFromTotal.value,
    })
    await accounts.bindCategories(id.value, selected.value)
    showToast('Сохранено')
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось сохранить')
  } finally {
    pending.value = false
  }
}

async function share() {
  if (!sync.online) {
    error.value = ONLINE_ONLY_MESSAGE
    return
  }
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

const successor = computed(() => {
  const userId = session.user?.id
  return [...members.value]
    .filter((item) => item.userId !== userId)
    .sort(
      (a, b) =>
        (a.joinedAt ?? '').localeCompare(b.joinedAt ?? '') || a.userId.localeCompare(b.userId),
    )[0]
})

async function afterRemoved() {
  await loadAccountData()
  await router.push('/')
}

async function leave() {
  if (!sync.online) {
    error.value = ONLINE_ONLY_MESSAGE
    return
  }
  const ok = await confirmAction({
    title: 'Покинуть счёт?',
    message: 'Он исчезнет из вашего списка, но останется у других участников.',
    confirmLabel: 'Покинуть',
    danger: true,
  })
  if (!ok) return
  try {
    await accounts.leave(id.value)
    await afterRemoved()
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось покинуть счёт')
  }
}

async function removeAccount() {
  if (!sync.online) {
    error.value = ONLINE_ONLY_MESSAGE
    return
  }
  const shared = accounts.isShared(id.value)
  const ok = await confirmAction(
    shared
      ? {
          title: 'Удалить счёт?',
          message: `Счёт останется у участников. Владельцем станет ${successor.value?.displayName ?? 'участник'}. Вы перестанете его видеть.`,
          confirmLabel: 'Удалить',
          danger: true,
        }
      : {
          title: 'Удалить счёт?',
          message: 'Счёт и все его операции, покупки и правила будут удалены.',
          confirmLabel: 'Удалить',
          danger: true,
        },
  )
  if (!ok) return
  try {
    await accounts.deleteAccount(id.value)
    await afterRemoved()
  } catch (err) {
    error.value = getErrorMessage(err, 'Не удалось удалить счёт')
  }
}
</script>

<template>
  <div v-if="account" class="page">
    <section class="hero">
      <p class="hero__name">
        <span class="hero__title">{{ account.name }}</span>
        <AppTag v-if="accounts.isShared(account.id)" type="primary">Общий счёт</AppTag>
        <AppTag v-if="account.excludeFromTotal" type="default">Не в итоге</AppTag>
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
      Перевод между счетами
    </AppButton>

    <section class="block">
      <h2>Участники</h2>
      <ul class="members">
        <li v-for="member in members" :key="member.userId" class="member">
          <span class="member__avatar" aria-hidden="true">{{ memberInitials(member.displayName) }}</span>
          <span class="member__body">
            <span class="member__name">{{ member.displayName }}</span>
            <span class="member__tags">
              <AppTag v-if="member.userId === session.user?.id" type="info">вы</AppTag>
              <AppTag v-if="member.userId === account.ownerId" type="default">владелец</AppTag>
            </span>
          </span>
        </li>
      </ul>
      <div class="share" data-tour="account-share">
        <template v-if="account.inviteCode">
          <p class="share-hint">
            Отправьте этот код человеку — он добавит тот же счёт у себя, не копию.
          </p>
          <p class="code">{{ account.inviteCode }}</p>
          <div class="share-actions">
            <AppButton variant="secondary" block @click="copyCode()">Скопировать код</AppButton>
            <AppButton variant="ghost" block @click="nativeShare">Поделиться кодом</AppButton>
          </div>
        </template>
        <AppButton v-else variant="secondary" block :disabled="!sync.online" @click="share">
          {{ sync.online ? 'Поделиться счётом' : ONLINE_ONLY_MESSAGE }}
        </AppButton>
      </div>
      <AppButton v-if="!isOwner" variant="danger" block :disabled="!sync.online" @click="leave">
        Покинуть счёт
      </AppButton>
      <AppButton v-else variant="danger" block :disabled="!sync.online" @click="removeAccount">
        Удалить счёт
      </AppButton>
    </section>

    <section class="block">
      <button type="button" class="settings-toggle" @click="settingsOpen = !settingsOpen">
        {{ settingsOpen ? 'Скрыть настройки' : 'Изменить счёт' }}
      </button>
      <div v-if="settingsOpen" class="settings">
        <p class="share-hint">
          Изменит текущую сумму на счёте, но не затронет историю операций.
        </p>
        <AppField label="Название" for-id="d-name">
          <AppInput id="d-name" v-model="name" />
        </AppField>
        <AppField label="Баланс, ₽" for-id="d-amount">
          <AppInputNumber id="d-amount" v-model="amount" :min="0" />
        </AppField>
        <div class="exclude" @click="setExcludeFromTotal(!excludeFromTotal)">
          <span class="exclude__text">
            <span class="exclude__label">Не учитывать в общем балансе</span>
            <span class="exclude__hint">Не входит в сумму «все счета» на главной</span>
          </span>
          <span @click.stop>
            <AppSwitch
              :checked="excludeFromTotal"
              :loading="excludePending"
              aria-label="Не учитывать в общем балансе"
              @update:checked="setExcludeFromTotal"
            />
          </span>
        </div>
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
  <div v-else class="not-found">
    <p>Счёт не найден</p>
    <AppButton variant="secondary" @click="router.push('/accounts')">К списку счетов</AppButton>
  </div>
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

.members {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: 52px;
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.member:first-child {
  border-top: 0;
}

.member__avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.member__body {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.member__name {
  min-width: 0;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__tags {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.share {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.share-hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.code {
  padding: var(--space-3);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
}

.share-actions,
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.exclude {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  cursor: pointer;
}

.exclude__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exclude__label {
  font-weight: 700;
}

.exclude__hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.35;
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

.not-found {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}
</style>
