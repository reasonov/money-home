<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, Plus } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  AppButton,
  AppEmpty,
  AppPeriodSelect,
  AppSegmented,
  AppSkeleton,
  formatMoney,
  openFormDrawer,
  todayLocal,
  useHorizontalSwipe,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import {
  canShiftChartPeriod,
  filterStatsTransactions,
  formatPeriodLabel,
  rollupCategorySlices,
  shiftChartPeriod,
  useTransactionStore,
  type CategorySpendSlice,
  type ChartPeriod,
} from '@/entities/transaction'
import { InstallHint } from '@/features/install-pwa'
import { RepeatHint } from '@/features/suggest-repeat'
import { AccountAvailableHint } from '@/widgets/account-available'
import { CategorySpendChart } from '@/widgets/stats-charts'
import { UpcomingEvents } from '@/widgets/upcoming-events'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()
const categories = useCategoryStore()
const router = useRouter()

const period = ref<ChartPeriod>('month')
const kind = ref<'expense' | 'income'>('expense')
const asOf = ref(todayLocal())
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())
const drillGroupId = ref<string | null>(null)

const kindOptions: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const customRange = computed(() => ({
  from: customFrom.value,
  to: customTo.value,
}))

const periodLabel = computed(() =>
  formatPeriodLabel(period.value, asOf.value, customRange.value),
)

const canShiftNext = computed(() =>
  canShiftChartPeriod(period.value, asOf.value, 1, customRange.value),
)

function onPeriodShift(delta: number) {
  if (delta > 0 && !canShiftNext.value) {
    return
  }
  const next = shiftChartPeriod(period.value, asOf.value, delta, customRange.value)
  asOf.value = next.asOf
  if (next.from) customFrom.value = next.from
  if (next.to) customTo.value = next.to
}

const {
  rootRef: sliderRef,
  offset: sliderOffset,
  dragging: sliderDragging,
  settling: sliderSettling,
  animateSwipe,
  onPointerDown: onSliderDown,
  onPointerMove: onSliderMove,
  onPointerUp: onSliderUp,
  onPointerCancel: onSliderCancel,
} = useHorizontalSwipe({
  onSwipe: onPeriodShift,
  canSwipe: (delta) => delta < 0 || canShiftNext.value,
})

const sliderStyle = computed(() => ({
  transform: `translate3d(${sliderOffset.value}px, 0, 0)`,
  transition: sliderSettling.value
    ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
    : 'none',
}))

const filtered = computed(() =>
  filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: period.value,
    asOf: asOf.value,
    from: customFrom.value,
    to: customTo.value,
  }),
)

const slices = computed(() =>
  rollupCategorySlices(
    filtered.value,
    kind.value,
    categories.items,
    categories.groups,
    drillGroupId.value,
  ),
)
const drillGroup = computed(() =>
  drillGroupId.value ? categories.getGroupById(drillGroupId.value) : null,
)
const centerLabel = computed(() => (kind.value === 'expense' ? 'Потрачено' : 'Получено'))
const totalLabel = computed(() =>
  selectedAccountId.value === ALL_ACCOUNTS_ID
    ? 'Всего на счетах'
    : (accounts.selectedAccount?.name ?? 'Счёт'),
)

watch([kind, period, selectedAccountId], () => {
  drillGroupId.value = null
})

function openCategoryHistory(slice: CategorySpendSlice) {
  if (slice.groupId && !drillGroupId.value) {
    drillGroupId.value = slice.groupId
    return
  }
  void router.push({
    name: 'history',
    query: {
      category: slice.categoryId ?? 'none',
      kind: kind.value,
      period: period.value,
      ...(period.value === 'custom' ? { from: customFrom.value, to: customTo.value } : {}),
      ...(period.value !== 'custom' && period.value !== 'all' && asOf.value !== todayLocal()
        ? { asOf: asOf.value }
        : {}),
    },
  })
}
</script>

<template>
  <div class="home">
    <InstallHint />

    <AppSkeleton v-if="!accounts.loaded" :rows="6" />

    <AppEmpty
      v-else-if="!accounts.items.length"
      description="Создайте счёт для учёта денег или подключитесь к общему счёту по коду"
    >
      <div class="empty-actions" data-tour="home-create">
        <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
        <AppButton
          variant="secondary"
          block
          @click="openFormDrawer({ name: 'account', mode: 'join' })"
        >
          Подключиться по коду
        </AppButton>
      </div>
    </AppEmpty>

    <template v-else>
      <RepeatHint />
      <section class="hero" data-tour="home-balance">
        <p class="hero__label">{{ totalLabel }}</p>
        <p class="hero__total">{{ formatMoney(accounts.displayedTotal) }}</p>
        <AccountAvailableHint
          v-if="accounts.selectedAccount"
          :account-id="accounts.selectedAccount.id"
          :balance="accounts.selectedAccount.amount"
        />
        <AccountAvailableHint v-else />
        <div class="hero__cta" data-tour="home-cta">
          <AppButton block @click="openFormDrawer({ name: 'expense' })">
            <template #icon>
              <Plus :size="18" :stroke-width="2" />
            </template>
            Расход
          </AppButton>
          <AppButton variant="secondary" block @click="openFormDrawer({ name: 'income' })">
            <template #icon>
              <Plus :size="18" :stroke-width="2" />
            </template>
            Доход
          </AppButton>
        </div>
      </section>

      <UpcomingEvents />

      <section class="home__chart" data-tour="home-chart">
        <div class="home__toolbar">
          <AppSegmented v-model="kind" compact :options="kindOptions" aria-label="Тип операций" />
          <AppPeriodSelect
            v-model="period"
            v-model:from="customFrom"
            v-model:to="customTo"
            v-model:as-of="asOf"
            :label="periodLabel"
            :can-next="canShiftNext"
            spread
            @shift="animateSwipe"
          />
        </div>

        <button
          v-if="drillGroup"
          type="button"
          class="home__back"
          @click="drillGroupId = null"
        >
          Назад · {{ drillGroup.name }}
        </button>

        <div
          ref="sliderRef"
          class="home__slider"
          :class="{ 'is-dragging': sliderDragging }"
          @pointerdown="onSliderDown"
          @pointermove="onSliderMove"
          @pointerup="onSliderUp"
          @pointercancel="onSliderCancel"
        >
          <div class="home__slider-pane" :style="sliderStyle">
            <CategorySpendChart
              embedded
              :slices="slices"
              :center-label="centerLabel"
              @legend-click="openCategoryHistory"
            />
          </div>
        </div>
      </section>

      <RouterLink class="history-link" to="/history" aria-label="Открыть историю операций">
        История операций
        <ChevronRight :size="18" :stroke-width="1.8" />
      </RouterLink>
    </template>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hero {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.hero__label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.hero__total {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.hero__cta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.home__chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.home__toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
}

.home__slider {
  overflow: hidden;
  touch-action: pan-y;
}

.home__slider.is-dragging {
  touch-action: none;
}

.home__slider-pane {
  min-height: 220px;
  will-change: transform;
}

.home__back {
  align-self: start;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(100%, 280px);
  margin: 0 auto;
}

.history-link {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 2px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-accent);
  text-decoration: none;
}

.history-link:hover {
  text-decoration: none;
}
</style>
