<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { closeSidebar, toggleSidebar } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useProductTour } from '@/features/product-tour'
import { AppHeader } from '@/widgets/app-header'
import { AppSidebar } from '@/widgets/app-sidebar'
import { AppFormDrawers } from '@/widgets/app-drawers'
import { ActivityInbox } from '@/widgets/activity-inbox'
import { BottomNav } from '@/widgets/bottom-nav'

const route = useRoute()
const accounts = useAccountStore()

const showAccountSelect = computed(() => route.meta.accountSelect === true)
const pageTitle = computed(() => {
  if (route.name === 'account-detail') {
    const id = String(route.params.id ?? '')
    return accounts.getById(id)?.name ?? 'Счёт'
  }
  return typeof route.meta.title === 'string' ? route.meta.title : ''
})
const showNav = computed(() => route.meta.showNav !== false)

useProductTour()

watch(
  () => route.fullPath,
  () => {
    closeSidebar()
  },
)
</script>

<template>
  <div class="shell">
    <AppHeader
      :show-account-select="showAccountSelect"
      :title="pageTitle"
      @menu="toggleSidebar"
    >
      <template #actions>
        <ActivityInbox />
      </template>
    </AppHeader>
    <main class="shell__main" :class="{ 'has-nav': showNav }">
      <RouterView />
    </main>
    <BottomNav v-if="showNav" />
    <AppSidebar />
    <AppFormDrawers />
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
