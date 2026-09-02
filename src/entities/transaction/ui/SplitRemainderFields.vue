<script setup lang="ts">
import { computed, watch } from 'vue'
import { X } from '@lucide/vue'
import { AppButton, AppInputNumber, createUuid, formatMoney } from '@/shared'
import { CategorySelect, type Category } from '@/entities/category'
import {
  MAX_SPLIT_LINES,
  remainderAfterSplits,
  type SplitRemainderLine,
} from '../lib/splitRemainder'

const props = defineProps<{
  total: number
  remainderCategoryId: string
  remainderCategoryName: string
  categories: Category[]
}>()

const lines = defineModel<SplitRemainderLine[]>({ required: true })

const remainder = computed(() => remainderAfterSplits(props.total, lines.value))

const remainderHint = computed(() => {
  if (!Number.isFinite(remainder.value)) {
    return ''
  }
  const name = props.remainderCategoryName || 'категория'
  return `Остаток: ${formatMoney(remainder.value)} — ${name}`
})

function usedCategoryIds(exceptKey?: string) {
  const used = new Set<string>()
  if (props.remainderCategoryId) {
    used.add(props.remainderCategoryId)
  }
  for (const line of lines.value) {
    if (line.key !== exceptKey && line.categoryId) {
      used.add(line.categoryId)
    }
  }
  return used
}

function catsFor(key: string) {
  const used = usedCategoryIds(key)
  const current = lines.value.find((line) => line.key === key)?.categoryId
  return props.categories.filter((item) => item.id === current || !used.has(item.id))
}

const unusedCats = computed(() => {
  const used = usedCategoryIds()
  return props.categories.filter((item) => !used.has(item.id))
})

const canAdd = computed(
  () => lines.value.length < MAX_SPLIT_LINES && unusedCats.value.length > 0,
)

const canStart = computed(() => props.categories.length >= 2)

function emptyLine(): SplitRemainderLine {
  return {
    key: createUuid(),
    categoryId: unusedCats.value[0]?.id ?? '',
    amount: '',
  }
}

function addLine() {
  if (!canAdd.value && lines.value.length > 0) {
    return
  }
  if (!canStart.value && lines.value.length === 0) {
    return
  }
  lines.value = [...lines.value, emptyLine()]
}

function removeLine(key: string) {
  lines.value = lines.value.filter((line) => line.key !== key)
}

function patchLine(key: string, patch: Partial<SplitRemainderLine>) {
  lines.value = lines.value.map((line) => (line.key === key ? { ...line, ...patch } : line))
}

watch(
  () => [props.categories, props.remainderCategoryId] as const,
  () => {
    const ids = new Set(props.categories.map((item) => item.id))
    const next = lines.value.map((line) => {
      if (
        line.categoryId &&
        (line.categoryId === props.remainderCategoryId || !ids.has(line.categoryId))
      ) {
        return { ...line, categoryId: '' }
      }
      return line
    })
    if (next.some((line, index) => line.categoryId !== lines.value[index]?.categoryId)) {
      lines.value = next
    }
  },
)
</script>

<template>
  <div class="split">
    <AppButton v-if="!lines.length" type="button" variant="secondary" block :disabled="!canStart" @click="addLine">
      Выделить из суммы
    </AppButton>

    <template v-else>
      <ul class="split__list">
        <li v-for="line in lines" :key="line.key" class="split__row">
          <CategorySelect
            :id="`split-cat-${line.key}`"
            :model-value="line.categoryId"
            :categories="catsFor(line.key)"
            required
            @update:model-value="patchLine(line.key, { categoryId: $event })"
          />
          <AppInputNumber
            :id="`split-amount-${line.key}`"
            :model-value="line.amount"
            placeholder="0"
            @update:model-value="patchLine(line.key, { amount: $event })"
          />
          <AppButton
            type="button"
            variant="ghost"
            class="split__remove"
            aria-label="Удалить категорию"
            @click="removeLine(line.key)"
          >
            <template #icon>
              <X :size="20" :stroke-width="2.2" />
            </template>
          </AppButton>
        </li>
      </ul>
      <p class="split__hint" :class="{ 'is-bad': Number.isFinite(remainder) && remainder <= 0 }">
        {{ remainderHint }}
      </p>
      <AppButton v-if="canAdd" type="button" variant="secondary" block @click="addLine">
        Ещё категория
      </AppButton>
    </template>
  </div>
</template>

<style scoped>
.split {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.split__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.split__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.split__row :deep(.cat-select) {
  flex: 1;
  min-width: 0;
}

.split__row :deep(.app-input-number) {
  flex: 0 0 6.5rem;
  width: 6.5rem;
}

.split__row :deep(.split__remove) {
  flex-shrink: 0;
  width: 44px;
  min-width: 44px;
  padding-left: 0;
  padding-right: 0;
}

.split__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.split__hint.is-bad {
  color: var(--color-danger);
}
</style>
