<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '../model/store'

const props = defineProps<{
  entityId: string
}>()

const sync = useSyncStore()
const active = computed(() => sync.isPending(props.entityId))
</script>

<template>
  <span class="mark">
    <span
      class="mark__dot"
      :class="{ 'is-on': active }"
      :aria-hidden="!active"
      :aria-label="active ? 'Ещё не синхронизировано' : undefined"
    />
    <slot />
  </span>
</template>

<style scoped>
.mark {
  display: inline;
}

.mark__dot {
  display: inline-block;
  width: 0;
  height: 8px;
  margin-right: 0;
  vertical-align: 2px;
  border-radius: 50%;
  background: var(--color-warning);
  opacity: 0;
  transform: scale(0.6);
  overflow: hidden;
  transition:
    width 0.2s ease,
    margin-right 0.2s ease,
    opacity 0.25s ease,
    transform 0.25s ease;
}

.mark__dot.is-on {
  width: 8px;
  margin-right: 6px;
  opacity: 1;
  transform: scale(1);
}
</style>
