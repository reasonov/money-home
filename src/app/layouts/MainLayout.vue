<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AppHeader } from '@/widgets/app-header'
import { ActivityInbox } from '@/widgets/activity-inbox'
import { BottomNav } from '@/widgets/bottom-nav'

const route = useRoute()

const title = computed(() => (route.meta.title as string | undefined) ?? '')
const showNav = computed(() => route.meta.showNav !== false)
const showBrand = computed(() => route.meta.showBrand !== false)
</script>

<template>
  <div class="shell">
    <AppHeader :title="title" :show-brand="showBrand">
      <template #actions>
        <ActivityInbox />
      </template>
    </AppHeader>
    <main class="shell__main" :class="{ 'has-nav': showNav }">
      <RouterView />
    </main>
    <BottomNav v-if="showNav" />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: var(--app-max-width);
  margin: 0 auto;
  background: var(--color-bg);
}

.shell__main {
  flex: 1;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-5) + env(safe-area-inset-bottom));
}

.shell__main.has-nav {
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-4));
}
</style>
