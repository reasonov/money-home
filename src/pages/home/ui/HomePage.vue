<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { AppButton } from '@/shared'
import { BalanceHero } from '@/widgets/balance-hero'
import { HistoryTeaser } from '@/widgets/purchase-history'
import { PurchaseList } from '@/widgets/purchase-list'
</script>

<template>
  <div class="home">
    <BalanceHero />
    <div class="home__cta">
      <RouterLink to="/purchases/new" custom v-slot="{ navigate }">
        <AppButton block @click="navigate">Новая покупка</AppButton>
      </RouterLink>
    </div>
    <PurchaseList />
    <HistoryTeaser />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.home__cta {
  display: flex;
}
</style>
