<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  notes: string
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="notes">
    <button type="button" class="notes__toggle" @click="toggle">
      {{ expanded ? 'Скрыть описание' : 'Показать описание' }}
    </button>
    <p v-if="expanded" class="notes__text">{{ notes }}</p>
  </div>
</template>

<style scoped>
.notes {
  margin-top: var(--space-2);
}

.notes__toggle {
  padding: 0;
  border: none;
  background: none;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
}

.notes__text {
  margin: var(--space-2) 0 0;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-text);
}
</style>
