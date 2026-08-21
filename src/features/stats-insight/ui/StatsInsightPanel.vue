<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, AppSkeleton, openFormDrawer } from '@/shared'
import { useSyncStore } from '@/entities/sync'
import { fetchStatsInsight } from '../api/statsInsightApi'
import { leverChart, leverCtaLabel } from '../lib/buildInsightLevers'
import type { InsightChartId, InsightTip, StatsInsightResult, StatsInsightSummary } from '../model/types'

const props = withDefaults(
  defineProps<{
    summary: StatsInsightSummary
    plain?: boolean
  }>(),
  { plain: false },
)

const emit = defineEmits<{
  selectChart: [chart: InsightChartId]
}>()

const router = useRouter()
const sync = useSyncStore()
const result = ref<StatsInsightResult | null>(null)
const loading = ref(false)
const failed = ref(false)

const cacheKey = computed(() =>
  JSON.stringify({
    accountId: props.summary.accountId,
    period: props.summary.period,
    from: props.summary.from ?? '',
    to: props.summary.to ?? '',
    currentExpense: props.summary.currentExpense,
    previousExpense: props.summary.previousExpense,
    ids: props.summary.levers.map((item) => item.id),
  }),
)

function openHistory(tip: InsightTip) {
  emit('selectChart', 'category')
  void router.push({
    name: 'history',
    query: {
      category: tip.categoryId ?? 'none',
      kind: 'expense',
      period: props.summary.period,
      ...(props.summary.period === 'custom' && props.summary.from && props.summary.to
        ? { from: props.summary.from, to: props.summary.to }
        : {}),
    },
  })
}

function openTip(tip: InsightTip) {
  emit('selectChart', leverChart(tip.kind))
  if (tip.kind === 'large_operation' && tip.transactionId) {
    openFormDrawer({ name: 'transaction-edit', transactionId: tip.transactionId })
    return
  }
  if (tip.kind === 'forecast_dip') {
    return
  }
  openHistory(tip)
}

function canAct(tip: InsightTip) {
  if (tip.kind === 'large_operation') {
    return Boolean(tip.transactionId)
  }
  return true
}

function cta(tip: InsightTip) {
  return leverCtaLabel({
    id: tip.id,
    kind: tip.kind,
    fact: '',
    impact: tip.impact,
    ...(tip.categoryName ? { categoryName: tip.categoryName } : {}),
    ...(tip.categoryId ? { categoryId: tip.categoryId } : {}),
    ...(tip.transactionId ? { transactionId: tip.transactionId } : {}),
  })
}

async function load() {
  if (!sync.online || !props.summary.levers.length) {
    result.value = null
    loading.value = false
    failed.value = false
    return
  }
  loading.value = true
  failed.value = false
  try {
    result.value = await fetchStatsInsight(props.summary)
  } catch {
    result.value = null
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(
  [cacheKey, () => sync.online],
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <section
    v-if="sync.online && summary.levers.length"
    class="insight"
    :class="{ 'is-plain': plain }"
    aria-label="Разбор периода"
  >
    <AppSkeleton v-if="loading" :rows="3" />

    <template v-else-if="result && (result.tips.length || result.summary)">
      <button
        v-if="result.summary"
        type="button"
        class="insight__summary"
        @click="emit('selectChart', 'category')"
      >
        {{ result.summary }}
      </button>
      <ul class="tips">
        <li
          v-for="(tip, index) in result.tips"
          :key="tip.id"
          class="tip"
          :class="{ 'is-primary': index === 0 }"
        >
          <strong>{{ tip.title }}</strong>
          <span>{{ tip.detail }}</span>
          <AppButton
            v-if="canAct(tip)"
            :variant="index === 0 ? 'primary' : 'secondary'"
            block
            @click="openTip(tip)"
          >
            {{ cta(tip) }}
          </AppButton>
        </li>
      </ul>
      <p class="insight__note">Это разбор ваших цифр за период, не финансовая консультация.</p>
    </template>

    <p v-else-if="failed" class="insight__note">Не удалось получить разбор. Ориентируйтесь на сводку выше.</p>
  </section>
</template>

<style scoped>
.insight {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.insight.is-plain {
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.insight__summary {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.9375rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
}

.insight__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.tips {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  gap: var(--space-3);
}

.tip {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.tip.is-primary {
  border-color: var(--color-accent);
}

.tip span {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}
</style>
