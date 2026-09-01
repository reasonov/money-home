<script setup lang="ts">
import { AppButton } from '@/shared'

defineEmits<{
  select: []
  dismiss: []
}>()
</script>

<template>
  <aside class="offer" role="note">
    <p class="offer__text">Можно добавить базовые категории, которых ещё нет</p>
    <div class="offer__actions">
      <AppButton variant="ghost" @click="$emit('dismiss')">Не сейчас</AppButton>
      <AppButton @click="$emit('select')">Выбрать</AppButton>
    </div>
  </aside>
</template>

<style scoped>
.offer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.offer__text {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
}

.offer__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
</style>
