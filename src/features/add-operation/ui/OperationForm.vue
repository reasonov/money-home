<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  formatMoney,
  formatShortDate,
  getErrorMessage,
  isBrowserOnline,
  openFormDrawer,
  roundMoney,
  showToast,
  todayLocal,
  track,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  CategoryForm,
  CategoryIcon,
  CategorySelect,
  loadLastCategoryId,
  saveLastCategoryId,
  useCategoryStore,
  type Category,
  type CategoryKind,
} from '@/entities/category'
import { usePreferencesStore } from '@/entities/preferences'
import { useSessionStore } from '@/entities/session'
import {
  lastOperationAccountId,
  matchOperationsByAmount,
  useTransactionStore,
  type Transaction,
} from '@/entities/transaction'
import {
  findMatchingTemplate,
  TemplatePicker,
  useOperationTemplateStore,
  type OperationTemplate,
} from '@/entities/operation-template'
import { fetchParsedOperationLine } from '../api/parseOperationApi'
import {
  hasParseFields,
  isParseComplete,
  mergeParsedOperationLine,
  parseOperationLine,
  type ParsedOperationLine,
} from '../lib/parseOperationLine'

const props = defineProps<{
  kind: CategoryKind
  accountId?: string
}>()

const emit = defineEmits<{
  saved: [tx: Transaction]
}>()

const session = useSessionStore()
const accounts = useAccountStore()
const categories = useCategoryStore()
const transactions = useTransactionStore()
const templates = useOperationTemplateStore()
const prefs = usePreferencesStore()

function resolveDefaultAccountId() {
  const fromProp = accounts.getById(props.accountId ?? '')?.id
  if (fromProp) {
    return fromProp
  }
  if (accounts.selectedAccountId !== ALL_ACCOUNTS_ID && accounts.selectedAccount) {
    return accounts.selectedAccount.id
  }
  return (
    lastOperationAccountId(
      transactions.items,
      props.kind,
      accounts.items.map((item) => item.id),
    ) ??
    accounts.items[0]?.id ??
    ''
  )
}

const accountId = ref(resolveDefaultAccountId())
const categoryId = ref('')
const amount = ref<string | number>('')
const occurredOn = ref(todayLocal())
const title = ref('')
const notes = ref('')
const error = ref('')
const pending = ref(false)
const createOpen = ref(false)
const templatesOpen = ref(false)
const savingTemplate = ref(false)
const line = ref('')
const parsePending = ref(false)
const parseSuggestion = ref<ParsedOperationLine | null>(null)
let parseTimer: ReturnType<typeof setTimeout> | null = null
let parseSeq = 0

watch(parseSuggestion, (value) => {
  if (value) {
    track('parse_line_shown', { kind: props.kind })
  }
})

const PARSE_DEBOUNCE_MS = 600

const availableCats = computed(() => categories.forAccount(accountId.value, props.kind))

const parseCategories = computed(() =>
  availableCats.value.map((item) => ({ id: item.id, name: item.name })),
)

function applyParse(parsed: ParsedOperationLine, source: 'auto' | 'tap' = 'auto') {
  if (parsed.amount && parsed.amount > 0) {
    amount.value = parsed.amount
  }
  if (parsed.occurredOn && /^\d{4}-\d{2}-\d{2}$/.test(parsed.occurredOn)) {
    occurredOn.value = parsed.occurredOn
  }
  if (parsed.categoryId && availableCats.value.some((item) => item.id === parsed.categoryId)) {
    categoryId.value = parsed.categoryId
  }
  if (parsed.title) {
    title.value = parsed.title
  }
  parseSuggestion.value = null
  track('parse_line_applied', { kind: props.kind, source })
}

function applySuggestion() {
  if (parseSuggestion.value) {
    applyParse(parseSuggestion.value, 'tap')
  }
}

function suggestionLabel(parsed: ParsedOperationLine) {
  const parts: string[] = []
  if (parsed.amount && parsed.amount > 0) {
    parts.push(formatMoney(parsed.amount))
  }
  const category = availableCats.value.find((item) => item.id === parsed.categoryId)
  if (category) {
    parts.push(category.name)
  }
  if (parsed.title) {
    parts.push(parsed.title)
  }
  if (parsed.occurredOn) {
    parts.push(formatShortDate(parsed.occurredOn))
  }
  return parts.join(' · ')
}

async function runParse(text: string) {
  const seq = ++parseSeq
  const cats = parseCategories.value
  const today = todayLocal()
  const local = parseOperationLine(text, today, cats)
  if (isParseComplete(local)) {
    if (seq !== parseSeq) {
      return
    }
    applyParse(local)
    return
  }
  if (!isBrowserOnline() || !accountId.value) {
    parseSuggestion.value = hasParseFields(local) ? local : null
    return
  }
  parsePending.value = true
  try {
    const remote = await fetchParsedOperationLine({
      accountId: accountId.value,
      kind: props.kind,
      today,
      text,
      categories: cats,
    })
    if (seq !== parseSeq) {
      return
    }
    const merged = mergeParsedOperationLine(local, remote, cats, text)
    if (isParseComplete(merged)) {
      applyParse(merged)
      return
    }
    parseSuggestion.value = hasParseFields(merged) ? merged : hasParseFields(local) ? local : null
  } catch {
    if (seq !== parseSeq) {
      return
    }
    parseSuggestion.value = hasParseFields(local) ? local : null
  } finally {
    if (seq === parseSeq) {
      parsePending.value = false
    }
  }
}

function scheduleParse(text: string) {
  parseSuggestion.value = null
  if (parseTimer) {
    clearTimeout(parseTimer)
    parseTimer = null
  }
  const trimmed = text.trim()
  if (!trimmed || !/\d/.test(trimmed)) {
    parseSeq += 1
    parsePending.value = false
    return
  }
  parseTimer = setTimeout(() => {
    parseTimer = null
    void runParse(trimmed)
  }, PARSE_DEBOUNCE_MS)
}

function onLineEnter(event: KeyboardEvent) {
  event.preventDefault()
  if (parseTimer) {
    clearTimeout(parseTimer)
    parseTimer = null
  }
  const trimmed = line.value.trim()
  if (trimmed && /\d/.test(trimmed)) {
    void runParse(trimmed)
  }
}

watch(line, (text) => {
  scheduleParse(text)
})

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

const amountMatches = computed(() => {
  if (!prefs.amountSuggestions) {
    return []
  }
  const value = roundMoney(Number(amount.value))
  if (!Number.isFinite(value) || value <= 0) {
    return []
  }
  return matchOperationsByAmount(transactions.posted, {
    amount: value,
    kind: props.kind,
    accountId: accountId.value,
    categoryIds: availableCats.value.map((cat) => cat.id),
  })
})

const matchDismissed = ref(false)

watch(amount, () => {
  matchDismissed.value = false
})

const matchesOpen = computed(() => !matchDismissed.value && amountMatches.value.length > 0)

function matchLabel(item: Transaction) {
  return item.title || item.categoryName || 'Операция'
}

function applyMatch(item: Transaction) {
  if (item.categoryId && availableCats.value.some((cat) => cat.id === item.categoryId)) {
    categoryId.value = item.categoryId
  }
  title.value = item.title ?? ''
  notes.value = item.notes ?? ''
  matchDismissed.value = true
}

function applyTemplate(item: OperationTemplate) {
  amount.value = item.amount
  title.value = item.title ?? ''
  notes.value = item.notes ?? ''
  if (availableCats.value.some((cat) => cat.id === item.categoryId)) {
    categoryId.value = item.categoryId
  }
  templatesOpen.value = false
}

const canSaveTemplate = computed(() => {
  const value = Number(amount.value)
  return Boolean(categoryId.value && Number.isFinite(value) && value > 0)
})

const matchingTemplate = computed(() => {
  if (!canSaveTemplate.value) {
    return null
  }
  return (
    findMatchingTemplate(templates.items, {
      kind: props.kind,
      categoryId: categoryId.value,
      amount: Number(amount.value),
      title: title.value,
      notes: notes.value,
    }) ?? null
  )
})

const inFavorites = computed(() => Boolean(matchingTemplate.value))

async function toggleCurrentTemplate() {
  if (!canSaveTemplate.value || savingTemplate.value) {
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
        kind: props.kind,
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
    error.value = 'Выберите счёт и категорию, затем укажите сумму больше 0 ₽'
    return
  }
  pending.value = true
  try {
    const created = await transactions.addManual({
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
    showToast(props.kind === 'expense' ? 'Расход сохранён' : 'Доход сохранён')
    emit('saved', created)
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

  <form v-else class="form" @submit.prevent="onSubmit">
    <div class="form__fav">
      <AppButton type="button" variant="secondary" class="form__fav-fill" @click="templatesOpen = true">
        Заполнить из избранного
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
    <AppField
      label="Что записать"
      for-id="op-line"
      help="Строка вроде «пятёрочка 1840» или «вчера такси 500» разберётся в сумму, категорию, название и дату. Сохранить нужно отдельно. Офлайн — только сумма, дата и имя категории."
    >
      <div class="line" @keydown.enter.prevent="onLineEnter">
        <AppInput
          id="op-line"
          v-model="line"
          :placeholder="kind === 'expense' ? 'пятёрочка 1840' : 'зарплата 80 000'"
          autocomplete="off"
        />
        <p v-if="parsePending" class="line-hint">Разбираем…</p>
        <div v-else-if="parseSuggestion" class="line-suggest">
          <p>Похоже: {{ suggestionLabel(parseSuggestion) }}</p>
          <AppButton type="button" variant="secondary" block @click="applySuggestion">
            Подставить
          </AppButton>
        </div>
      </div>
    </AppField>
    <AppField
      label="Сумма, ₽"
      for-id="op-amount"
      required
      help="При вводе покажем до трёх операций из истории с такой суммой. Выбор подставит категорию, название и комментарий. Счёт и дата не меняются."
    >
      <div class="amount">
        <AppInputNumber id="op-amount" v-model="amount" :min="1" placeholder="0" />
        <ul v-if="matchesOpen" class="matches" role="listbox" aria-label="Похожие операции">
          <li v-for="item in amountMatches" :key="item.id" role="none">
            <button
              type="button"
              class="match"
              role="option"
              @mousedown.prevent
              @click="applyMatch(item)"
            >
              <CategoryIcon
                v-if="item.categoryIcon && item.categoryColor"
                :icon="item.categoryIcon"
                :color="item.categoryColor"
                :size="28"
              />
              <span class="match__body">
                <span class="match__title">{{ matchLabel(item) }}</span>
                <span v-if="item.categoryName" class="match__meta">{{ item.categoryName }}</span>
              </span>
              <span class="match__date">{{ formatShortDate(item.occurredOn) }}</span>
            </button>
          </li>
        </ul>
      </div>
    </AppField>
    <AppField label="Счёт" for-id="op-account" required>
      <AppSelect id="op-account" v-model="accountId" required>
        <option v-for="account in accounts.items" :key="account.id" :value="account.id">
          {{ account.name }} · {{ formatMoney(account.amount) }}
        </option>
      </AppSelect>
    </AppField>
    <AppField label="Категория" for-id="op-cat" required>
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
    <AppEmpty
      v-if="!availableCats.length"
      :description="`Нет категорий ${props.kind === 'expense' ? 'расходов' : 'доходов'} для этого счёта`"
    >
      <AppButton variant="secondary" block @click="createOpen = true">Добавить категорию</AppButton>
    </AppEmpty>
    <AppField label="Дата" for-id="op-date" required>
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

  <AppDrawer v-model:open="templatesOpen" title="Избранное" height="90%">
    <TemplatePicker v-if="templatesOpen" :kind="kind" @select="applyTemplate" />
  </AppDrawer>

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

.form__fav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.form__fav :deep(.form__fav-fill) {
  flex: 1;
  min-width: 0;
}

.form__fav :deep(.form__fav-add) {
  flex-shrink: 0;
  width: 44px;
  min-width: 44px;
  padding-left: 0;
  padding-right: 0;
}

.line {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.line-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.line-suggest {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.line-suggest p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}

.amount {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.matches {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
}

.match {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: var(--space-1) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.match:hover,
.match:focus-visible {
  background: var(--color-accent-soft);
}

.match__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.match__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.match__meta,
.match__date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.match__date {
  flex-shrink: 0;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
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
