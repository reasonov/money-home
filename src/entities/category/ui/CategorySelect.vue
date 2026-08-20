<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AppDrawer, AppInput } from '@/shared'
import type { Category } from '../model/types'
import CategoryIcon from './CategoryIcon.vue'

const props = defineProps<{
  id?: string
  categories: Category[]
  required?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}>()

const model = defineModel<string>({ required: true })
const open = ref(false)
const query = ref('')

const emptyText = computed(() => props.emptyLabel ?? 'Без категории')

const selected = computed(() => props.categories.find((item) => item.id === model.value) ?? null)

const triggerLabel = computed(() => {
  if (selected.value) return selected.value.name
  if (!model.value && props.allowEmpty) return emptyText.value
  return 'Выберите категорию'
})

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase('ru-RU'))

const filtered = computed(() => {
  const q = normalizedQuery.value
  if (!q) return props.categories
  return props.categories.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(q))
})

const showEmptyOption = computed(() => Boolean(props.allowEmpty) && !normalizedQuery.value)

const noResults = computed(() => !showEmptyOption.value && filtered.value.length === 0)

function pick(id: string) {
  model.value = id
  open.value = false
}

watch(open, (value) => {
  if (!value) query.value = ''
})
</script>

<template>
  <div class="cat-select">
    <select
      class="cat-select__native"
      :id="id ? `${id}-native` : undefined"
      :required="required"
      tabindex="-1"
      aria-hidden="true"
      :value="model"
    >
      <option v-if="allowEmpty || !model" value="">{{ allowEmpty ? emptyText : '' }}</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>
    <button :id="id" type="button" class="cat-select__trigger" @click.prevent="open = true">
      <CategoryIcon
        v-if="selected"
        :icon="selected.icon"
        :color="selected.color"
        :size="32"
      />
      <span class="cat-select__value" :class="{ 'is-placeholder': !selected }">
        {{ triggerLabel }}
      </span>
    </button>
    <AppDrawer v-model:open="open" title="Категория" height="85%">
      <div class="cat-select__drawer">
        <AppInput :id="id ? `${id}-query` : undefined" v-model="query" placeholder="Поиск" />
        <p v-if="noResults" class="cat-select__empty">Ничего не найдено</p>
        <div v-else class="cat-select__list" role="listbox">
          <button
            v-if="showEmptyOption"
            type="button"
            class="cat-select__item"
            :class="{ 'is-on': !model }"
            role="option"
            @click="pick('')"
          >
            <span class="cat-select__name">{{ emptyText }}</span>
          </button>
          <button
            v-for="cat in filtered"
            :key="cat.id"
            type="button"
            class="cat-select__item"
            :class="{ 'is-on': model === cat.id }"
            role="option"
            @click="pick(cat.id)"
          >
            <CategoryIcon :icon="cat.icon" :color="cat.color" :size="36" />
            <span class="cat-select__name">{{ cat.name }}</span>
          </button>
        </div>
      </div>
    </AppDrawer>
  </div>
</template>

<style scoped>
.cat-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.cat-select__native {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.cat-select__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 48px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cat-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.cat-select__value.is-placeholder {
  font-weight: 400;
  color: var(--color-text-muted);
}

.cat-select__drawer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
}

.cat-select__list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.cat-select__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: var(--space-2) 2px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.cat-select__item.is-on {
  outline: 2px solid var(--color-accent);
  outline-offset: 0;
}

.cat-select__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.cat-select__empty {
  margin: 0;
  padding: var(--space-4) 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
