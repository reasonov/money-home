<script setup lang="ts">
import { WifiOff } from '@lucide/vue'
import { useSyncStore } from '../model/store'

const sync = useSyncStore()
</script>

<template>
  <div v-if="sync.showStatusIcon" class="status">
    <button type="button" class="status__btn" aria-describedby="sync-status-tip" aria-label="Нет сети">
      <WifiOff :size="20" :stroke-width="1.8" />
    </button>
    <p id="sync-status-tip" class="status__tip" role="tooltip">{{ sync.bannerText }}</p>
  </div>
</template>

<style scoped>
.status {
  position: relative;
  flex-shrink: 0;
}

.status__btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-warning);
  cursor: pointer;
}

.status__btn:hover,
.status:focus-within .status__btn {
  background: var(--color-warning-bg);
}

.status__tip {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 12;
  width: max-content;
  max-width: min(240px, calc(100vw - 32px));
  margin: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px var(--color-shadow);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.status:hover .status__tip,
.status:focus-within .status__tip {
  opacity: 1;
  visibility: visible;
}
</style>
