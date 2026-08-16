<script setup lang="ts" generic="T extends string">
withDefaults(
  defineProps<{
    options: { value: T; label: string }[]
    ariaLabel?: string
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" :class="{ 'is-compact': compact }" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      class="segmented__item"
      :class="{ 'is-active': model === option.value }"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  overflow-x: auto;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented__item {
  flex: 1 0 auto;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.segmented__item.is-active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
}

.segmented.is-compact {
  padding: 2px;
}

.segmented.is-compact .segmented__item {
  min-height: 36px;
  padding: 0 var(--space-2);
  font-size: 0.75rem;
  border-radius: 8px;
}
</style>
