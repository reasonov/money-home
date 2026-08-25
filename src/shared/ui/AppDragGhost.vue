<script setup lang="ts">
import type { DragGhost } from '@/shared/lib/pointerDrag'

defineProps<{
  ghost: DragGhost | null
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ghost"
      class="drag-ghost"
      aria-hidden="true"
      :style="{
        width: `${ghost.width}px`,
        minHeight: `${ghost.height}px`,
        transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)`,
      }"
    >
      <slot />
    </div>
  </Teleport>
</template>

<style>
.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2000000100;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 12px 28px var(--color-shadow);
  pointer-events: none;
  will-change: transform;
}

.drag-ghost__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.drag-ghost__label {
  min-width: 0;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
