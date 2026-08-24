<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AppBanner,
  AppButton,
  AppEmpty,
  AppSkeleton,
  closeFormDrawer,
  formatMoney,
  openFormDrawer,
} from '@/shared'
import { useAccountStore } from '@/entities/account'
import { fetchSavingsAdvice } from '../api/savingsAdviceApi'
import { buildAdviceSummary } from '../lib/buildAdviceSummary'
import { leverCtaLabel } from '../lib/buildAdviceLevers'
import type { SavingsAdviceResult, SavingsAdviceTip } from '../model/types'

const props = defineProps<{
  accountId: string
  goalId: string
}>()

const router = useRouter()
const accounts = useAccountStore()
const facts = buildAdviceSummary(props.accountId, props.goalId)
const advice = ref<SavingsAdviceResult | null>(null)
const loading = ref(Boolean(facts))
const failed = ref(!facts)

function tipCta(tip: SavingsAdviceTip): string {
  return leverCtaLabel({
    id: tip.id,
    kind: tip.kind,
    impact: tip.impact,
    coversGap: false,
    fact: '',
    ...(tip.categoryName ? { categoryName: tip.categoryName } : {}),
    ...(tip.categoryId ? { categoryId: tip.categoryId } : {}),
    ...(tip.groupId ? { groupId: tip.groupId } : {}),
    ...(tip.purchaseId ? { purchaseId: tip.purchaseId } : {}),
    ...(tip.ruleId ? { ruleId: tip.ruleId } : {}),
    ...(tip.newTargetDate ? { newTargetDate: tip.newTargetDate } : {}),
  })
}

function canAct(tip: SavingsAdviceTip): boolean {
  if (tip.kind === 'defer_purchase') {
    return Boolean(tip.purchaseId)
  }
  if (tip.kind === 'review_rule') {
    return Boolean(tip.ruleId)
  }
  return true
}

function openTip(tip: SavingsAdviceTip) {
  if (tip.kind === 'revert_category' || tip.kind === 'cut_category') {
    accounts.selectedAccountId = props.accountId
    closeFormDrawer()
    void router.push({
      name: 'history',
      query: {
        ...(tip.groupId ? { group: tip.groupId } : { category: tip.categoryId ?? 'none' }),
        kind: 'expense',
        period: 'month',
      },
    })
    return
  }
  if (tip.kind === 'defer_purchase' && tip.purchaseId) {
    openFormDrawer({ name: 'purchase-edit', purchaseId: tip.purchaseId })
    return
  }
  if (tip.kind === 'review_rule' && tip.ruleId) {
    openFormDrawer({ name: 'expense-rule', ruleId: tip.ruleId, accountId: props.accountId })
    return
  }
  if (tip.kind === 'delay_date' || tip.kind === 'set_aside') {
    openFormDrawer({ name: 'savings-goal', accountId: props.accountId, goalId: props.goalId })
  }
}

onMounted(async () => {
  if (!facts) {
    return
  }
  try {
    advice.value = await fetchSavingsAdvice(facts)
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="advice">
    <AppEmpty v-if="!loading && !facts" description="Копилка не найдена" />

    <template v-else>
      <p v-if="facts" class="advice__fact">{{ facts.goal.message }}</p>
      <p v-if="facts && facts.goal.extraPerMonth > 0" class="advice__meta">
        Чтобы успеть, нужно ещё {{ formatMoney(facts.goal.extraPerMonth) }} в месяц
      </p>

      <AppSkeleton v-if="loading" :rows="4" />

      <ul v-else-if="advice && (advice.tips.length || advice.summary)" class="tips">
        <li v-if="advice.summary" class="tips__summary">{{ advice.summary }}</li>
        <li
          v-for="(tip, index) in advice.tips"
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
            {{ tipCta(tip) }}
          </AppButton>
        </li>
      </ul>

      <AppBanner v-else-if="failed" variant="warning">
        Не удалось получить подробные советы. Ориентируйтесь на сумму выше.
      </AppBanner>

      <p class="advice__note">
        Шаги посчитаны по вашим тратам, правилам и планам. Это не финансовая консультация.
      </p>
    </template>
  </div>
</template>

<style scoped>
.advice {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.advice__fact {
  margin: 0;
  font-weight: 700;
}

.advice__meta,
.advice__note {
  margin: 0;
  font-size: 0.875rem;
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

.tips__summary {
  font-size: 0.9375rem;
  line-height: 1.45;
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
