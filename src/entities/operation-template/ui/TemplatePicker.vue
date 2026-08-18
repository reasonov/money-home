<script setup lang="ts">
import { computed } from 'vue'
import { AppEmpty, formatMoney } from '@/shared'
import { CategoryIcon, useCategoryStore } from '@/entities/category'
import { useOperationTemplateStore } from '../model/store'
import type { OperationTemplate } from '../model/types'

const props = defineProps<{
  kind: OperationTemplate['kind']
}>()

const emit = defineEmits<{
  select: [template: OperationTemplate]
}>()

const templates = useOperationTemplateStore()
const categories = useCategoryStore()

const items = computed(() => templates.forKind(props.kind))

function label(item: OperationTemplate) {
  return item.title || categories.getById(item.categoryId)?.name || 'Шаблон'
}

function category(item: OperationTemplate) {
  return categories.getById(item.categoryId)
}
</script>

<template>
  <div class="picker">
    <AppEmpty v-if="!items.length" description="Пока нет избранного этого типа" />
    <ul v-else class="list" role="listbox" aria-label="Избранное">
      <li v-for="item in items" :key="item.id" role="none">
        <button type="button" class="row" role="option" @click="emit('select', item)">
          <CategoryIcon
            v-if="category(item)"
            :icon="category(item)!.icon"
            :color="category(item)!.color"
            :size="32"
          />
          <span class="row__body">
            <span class="row__title">{{ label(item) }}</span>
            <span v-if="item.title && category(item)" class="row__meta">{{ category(item)!.name }}</span>
          </span>
          <span class="row__amount">{{ formatMoney(item.amount) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-2) 0;
  border: 0;
  border-top: 1px solid var(--color-border);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.list li:first-child .row {
  border-top: 0;
  padding-top: 0;
}

.row:hover,
.row:focus-visible {
  color: var(--color-accent);
}

.row__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.row__title {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__amount {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
