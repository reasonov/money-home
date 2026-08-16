<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, Plus } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import {
  AppButton,
  AppEmpty,
  AppPeriodSelect,
  AppSegmented,
  formatMoney,
  openFormDrawer,
  todayLocal,
} from '@/shared'
import { ALL_ACCOUNTS_ID, useAccountStore } from '@/entities/account'
import {
  filterStatsTransactions,
  formatPeriodLabel,
  totalsByCategory,
  useTransactionStore,
  type ChartPeriod,
} from '@/entities/transaction'
import { InstallHint } from '@/features/install-pwa'
import { CategorySpendChart } from '@/widgets/stats-charts'

const accounts = useAccountStore()
const { selectedAccountId } = storeToRefs(accounts)
const transactions = useTransactionStore()

const period = ref<ChartPeriod>('month')
const kind = ref<'expense' | 'income'>('expense')
const customFrom = ref(todayLocal().slice(0, 8) + '01')
const customTo = ref(todayLocal())

const kindOptions: { value: 'expense' | 'income'; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const periodLabel = computed(() =>
  formatPeriodLabel(period.value, undefined, {
    from: customFrom.value,
    to: customTo.value,
  }),
)

const filtered = computed(() =>
  filterStatsTransactions(transactions.posted, {
    accountId: selectedAccountId.value,
    period: period.value,
    from: customFrom.value,
    to: customTo.value,
  }),
)

const slices = computed(() => totalsByCategory(filtered.value, kind.value))
const centerLabel = computed(() => (kind.value === 'expense' ? 'Потрачено' : 'Получено'))
const emptyText = computed(() =>
  kind.value === 'expense' ? 'Нет расходов за период' : 'Нет доходов за период',
)
const totalLabel = computed(() =>
  selectedAccountId.value === ALL_ACCOUNTS_ID
    ? 'Всего на счетах'
    : (accounts.selectedAccount?.name ?? 'Счёт'),
)
</script>

<template>
  <div class="home">
    <InstallHint />

    <AppEmpty v-if="!accounts.items.length" description="Пока нет счетов">
      <div class="empty-actions" data-tour="home-create">
        <AppButton block @click="openFormDrawer({ name: 'account' })">Создать счёт</AppButton>
        <AppButton
          variant="secondary"
          block
          @click="openFormDrawer({ name: 'account', mode: 'join' })"
        >
          Ввести код
        </AppButton>
      </div>
    </AppEmpty>

    <template v-else>
      <section class="hero" data-tour="home-balance">
        <p class="hero__label">{{ totalLabel }}</p>
        <p class="hero__total">{{ formatMoney(accounts.displayedTotal) }}</p>
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

      <section class="home__chart" data-tour="home-chart">
        <div class="home__toolbar">
          <AppSegmented
            v-model="kind"
            compact
            :options="kindOptions"
            aria-label="Тип операций"
          />
          <AppPeriodSelect
            v-model="period"
            v-model:from="customFrom"
            v-model:to="customTo"
            :label="periodLabel"
          />
        </div>

        <CategorySpendChart
          v-if="slices.length"
          embedded
          :slices="slices"
          :center-label="centerLabel"
        />
        <AppEmpty v-else :description="emptyText" />
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

.hero__cta,
.empty-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.hero__cta {
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9.75rem;
  align-items: center;
  gap: var(--space-2);
}

.empty-actions {
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
