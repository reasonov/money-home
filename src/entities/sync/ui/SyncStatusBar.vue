<script setup lang="ts">
import { X } from '@lucide/vue'
import { AppButton, track } from '@/shared'
import { runSync } from '../lib/engine'
import { useSyncStore } from '../model/store'

const sync = useSyncStore()

function retry() {
  track('sync_retry')
  void runSync()
}
</script>

<template>
  <div v-if="sync.showBanner" class="bar" role="status">
    <p class="bar__text">{{ sync.bannerText }}</p>
    <AppButton v-if="sync.status === 'error'" variant="ghost" @click="retry">Повторить</AppButton>
    <button type="button" class="bar__close" aria-label="Скрыть" @click="sync.dismissBanner">
      <X :size="18" :stroke-width="2" />
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
  background: var(--color-accent-soft);
  color: var(--color-text);
}

.bar__text {
  flex: 1;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.bar__close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
</style>
