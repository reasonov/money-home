<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppDrawer } from '@/shared'
import {
  CATEGORY_ICON_GROUPS,
  CATEGORY_ICON_LABELS,
  type CategoryIconKey,
} from '../model/types'
import CategoryIcon from './CategoryIcon.vue'

const props = defineProps<{
  color: string
}>()

const icon = defineModel<CategoryIconKey>({ required: true })
const open = ref(false)

const currentLabel = computed(() => CATEGORY_ICON_LABELS[icon.value] ?? CATEGORY_ICON_LABELS.other)

function pick(next: CategoryIconKey) {
  icon.value = next
  open.value = false
}
</script>

<template>
  <div class="picker">
    <button type="button" class="picker__trigger" @click.prevent="open = true">
      <CategoryIcon :icon="icon" :color="props.color" :size="32" />
      <span class="picker__meta">
        <span class="picker__label">Иконка</span>
        <span class="picker__value">{{ currentLabel }}</span>
      </span>
    </button>
    <AppDrawer v-model:open="open" title="Иконка" height="85%">
      <div class="picker__drawer">
        <section v-for="group in CATEGORY_ICON_GROUPS" :key="group.id" class="picker__group">
          <h3 class="picker__heading">{{ group.label }}</h3>
          <div class="picker__grid">
            <button
              v-for="item in group.icons"
              :key="item"
              type="button"
              class="picker__icon"
              :class="{ 'is-on': icon === item }"
              :title="CATEGORY_ICON_LABELS[item]"
              @click="pick(item)"
            >
              <CategoryIcon :icon="item" :color="props.color" :size="36" />
              <span class="picker__name">{{ CATEGORY_ICON_LABELS[item] }}</span>
            </button>
          </div>
        </section>
      </div>
    </AppDrawer>
  </div>
</template>

<style scoped>
.picker__trigger {
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

.picker__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker__label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.picker__value {
  font-weight: 600;
}

.picker__drawer {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
}

.picker__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.picker__heading {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.picker__icon {
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
  cursor: pointer;
}

.picker__icon.is-on {
  outline: 2px solid var(--color-accent);
  outline-offset: 0;
}

.picker__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}
</style>
