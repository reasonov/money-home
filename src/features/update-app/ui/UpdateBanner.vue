<script setup lang="ts">
import { AppButton } from '@/shared'
import { useAppUpdateStore } from '../model/store'

const update = useAppUpdateStore()
</script>

<template>
  <div v-if="update.outdated" class="bar" role="status">
    <p class="bar__text">Доступна версия {{ update.latestVersion }}</p>
    <AppButton variant="ghost" :disabled="update.applying" @click="update.apply">
      {{ update.applying ? 'Обновление…' : 'Обновить' }}
    </AppButton>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent-soft);
  color: var(--color-text);
}

.bar__text {
  flex: 1;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
}
</style>
