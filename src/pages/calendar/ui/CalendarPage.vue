<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppButton, AppSegmented, openFormDrawer } from '@/shared'
import { PurchaseList } from '@/widgets/purchase-list'
import { PlanningCalendar } from '@/widgets/planning-calendar'

const route = useRoute()
const router = useRouter()
const view = ref<'list' | 'month'>('list')

const viewOptions: { value: 'list' | 'month'; label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'month', label: 'Месяц' },
]

const focusPurchaseId = computed(() => {
  const value = route.query.purchase
  return typeof value === 'string' && value ? value : undefined
})

watch(
  focusPurchaseId,
  (id) => {
    if (id) {
      view.value = 'list'
    }
  },
  { immediate: true },
)

function onPurchaseFocused() {
  if (!focusPurchaseId.value) {
    return
  }
  const query = { ...route.query }
  delete query.purchase
  void router.replace({ query })
}
</script>

<template>
  <div class="calendar">
    <div class="calendar__intro" data-tour="calendar-cta">
      <AppSegmented v-model="view" compact :options="viewOptions" aria-label="Вид планов" />
      <AppButton block @click="openFormDrawer({ name: 'purchase-new' })">Новая покупка</AppButton>
    </div>
    <PlanningCalendar v-if="view === 'month'" />
    <PurchaseList v-else :focus-id="focusPurchaseId" @focused="onPurchaseFocused" />
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.calendar__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
