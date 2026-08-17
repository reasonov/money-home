<script setup lang="ts">
import { AppButton } from '@/shared'
import { runSync } from '../lib/engine'
import { useSyncStore } from '../model/store'

const sync = useSyncStore()
</script>

<template>
  <div v-if="sync.bannerText" class="bar" role="status">
    <p class="bar__text">{{ sync.bannerText }}</p>
    <AppButton v-if="sync.status === 'error'" variant="ghost" @click="runSync">Повторить</AppButton>
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
