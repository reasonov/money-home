<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NDropdown } from 'naive-ui'
import { AppButton, AppSegmented } from '@/shared'
import {
  PlanFeed,
  PlanningCalendar,
  isPlanAddKind,
  isPlanScope,
  openPlanCreate,
  PLAN_ADD_OPTIONS,
  type PlanEventKind,
  type PlanScope,
} from '@/widgets/planning-calendar'

type PlanView = 'list' | 'month'

const route = useRoute()
const router = useRouter()
const view = ref<PlanView>('list')
const scope = ref<PlanScope>(initialScope())

const viewOptions: { value: PlanView; label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'month', label: 'Месяц' },
]

const scopeOptions: { value: PlanScope; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'purchases', label: 'Покупки' },
  { value: 'regular', label: 'Регулярные' },
]

function initialScope(): PlanScope {
  if (isPlanScope(route.query.kind)) {
    return route.query.kind
  }
  return 'all'
}

function parseRuleKind(value: unknown): PlanEventKind | undefined {
  if (value === 'income' || value === 'expense' || value === 'transfer') {
    return value
  }
  return undefined
}

const focusPurchaseId = computed(() => {
  const value = route.query.purchase
  return typeof value === 'string' && value ? value : undefined
})

const focusRuleId = computed(() => {
  const value = route.query.rule
  return typeof value === 'string' && value ? value : undefined
})

const focusRuleKind = computed(() => parseRuleKind(route.query.ruleKind))

watch(scope, (value) => {
  const current = isPlanScope(route.query.kind) ? route.query.kind : 'all'
  if (value === current) {
    return
  }
  const query = { ...route.query }
  if (value === 'all') {
    delete query.kind
  } else {
    query.kind = value
  }
  void router.replace({ query })
})

watch(
  () => [route.query.kind, route.query.purchase, route.query.rule] as const,
  () => {
    if (route.query.purchase || route.query.rule) {
      scope.value = 'all'
      view.value = 'list'
      return
    }
    scope.value = isPlanScope(route.query.kind) ? route.query.kind : 'all'
  },
)

function onFocused() {
  if (!focusPurchaseId.value && !focusRuleId.value) {
    return
  }
  const query = { ...route.query }
  delete query.purchase
  delete query.rule
  delete query.ruleKind
  void router.replace({ query })
}

function onAdd(key: string | number) {
  if (isPlanAddKind(key)) {
    openPlanCreate(key)
  }
}
</script>

<template>
  <div class="calendar">
    <div class="calendar__intro" data-tour="calendar-cta">
      <AppSegmented v-model="view" compact :options="viewOptions" aria-label="Вид планов" />
      <AppSegmented v-model="scope" compact :options="scopeOptions" aria-label="Тип планов" />
      <NDropdown
        trigger="click"
        placement="bottom-end"
        :options="PLAN_ADD_OPTIONS"
        @select="onAdd"
      >
        <AppButton block>Добавить</AppButton>
      </NDropdown>
    </div>

    <PlanningCalendar v-if="view === 'month'" :scope="scope" />
    <PlanFeed
      v-else
      :scope="scope"
      :focus-purchase-id="focusPurchaseId"
      :focus-rule-id="focusRuleId"
      :focus-rule-kind="focusRuleKind"
      @focused="onFocused"
    />
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
  gap: var(--space-3);
}

.calendar__intro :deep(.n-dropdown-trigger) {
  display: block;
  width: 100%;
}
</style>
