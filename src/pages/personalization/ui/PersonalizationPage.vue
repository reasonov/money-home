<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { AppSwitch, assignBottomNavSlot, NAV_ITEM_BY_ID, NAV_ITEMS, type NavItemId } from '@/shared'
import { usePreferencesStore } from '@/entities/preferences'

const prefs = usePreferencesStore()
const activeSlot = ref(0)

const slotItems = computed(() =>
  prefs.bottomNav.flatMap((id) => {
    const item = NAV_ITEM_BY_ID[id]
    return item ? [item] : []
  }),
)

function slotOf(id: NavItemId) {
  const index = prefs.bottomNav.indexOf(id)
  return index >= 0 ? index : null
}

function pickSlot(slot: number) {
  activeSlot.value = slot
}

function pickItem(id: NavItemId) {
  prefs.setBottomNav(assignBottomNavSlot(prefs.bottomNav, id, activeSlot.value))
}
</script>

<template>
  <div class="page">
    <section class="card">
      <div class="row">
        <span class="row__text">
          <span class="row__label">Предложения при вводе суммы</span>
          <span class="row__hint">Показывать прошлые расходы и доходы с той же суммой</span>
        </span>
        <AppSwitch
          :checked="prefs.amountSuggestions"
          aria-label="Предложения при вводе суммы"
          @update:checked="prefs.setAmountSuggestions"
        />
      </div>
    </section>

    <section class="card">
      <h2 class="heading">Нижнее меню</h2>
      <p class="hint">Четыре пункта слева направо вокруг «+». Нажмите позицию, затем страницу</p>
      <div class="preview" role="list" aria-label="Позиции нижнего меню">
        <template v-for="(item, index) in slotItems" :key="item.id">
          <span v-if="index === 2" class="preview__plus" aria-hidden="true">
            <Plus :size="16" :stroke-width="2.2" />
          </span>
          <button
            type="button"
            class="preview__slot"
            :class="{ 'is-active': activeSlot === index }"
            role="listitem"
            :aria-pressed="activeSlot === index"
            :aria-label="`Позиция ${index + 1}: ${item.label}`"
            @click="pickSlot(index)"
          >
            <span class="preview__index">{{ index + 1 }}</span>
            <span class="preview__icon" aria-hidden="true">
              <component :is="item.icon" :size="18" :stroke-width="1.8" />
            </span>
            <span class="preview__label">{{ item.label }}</span>
          </button>
        </template>
      </div>
      <div class="nav-list">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.id"
          type="button"
          class="nav-row"
          :class="{ 'is-on': slotOf(item.id) !== null, 'is-active': slotOf(item.id) === activeSlot }"
          :aria-pressed="slotOf(item.id) !== null"
          :aria-label="`Поставить «${item.label}» на позицию ${activeSlot + 1}`"
          @click="pickItem(item.id)"
        >
          <span class="nav-row__icon" aria-hidden="true">
            <component :is="item.icon" :size="18" :stroke-width="1.8" />
          </span>
          <span class="nav-row__label">{{ item.label }}</span>
          <span class="nav-row__rank" aria-hidden="true">{{
            slotOf(item.id) !== null ? slotOf(item.id)! + 1 : ''
          }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.heading {
  margin: 0 0 var(--space-1);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hint {
  margin: 0 0 var(--space-3);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
}

.row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__label {
  font-weight: 700;
}

.row__hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

.preview {
  display: grid;
  grid-template-columns: 1fr 1fr auto 1fr 1fr;
  gap: var(--space-1);
  align-items: stretch;
  margin-bottom: var(--space-2);
}

.preview__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  min-height: 64px;
  padding: var(--space-1) 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font: inherit;
  cursor: pointer;
}

.preview__slot.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.preview__index {
  font-size: 0.625rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.preview__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
}

.preview__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__plus {
  display: grid;
  align-self: center;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.nav-list {
  display: flex;
  flex-direction: column;
}

.nav-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) 0;
  border: 0;
  border-top: 1px solid var(--color-border);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.nav-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.nav-row__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.nav-row__label {
  flex: 1;
  min-width: 0;
  font-weight: 700;
}

.nav-row__rank {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.nav-row.is-on .nav-row__rank {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.nav-row.is-active .nav-row__rank {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-on-accent);
}
</style>
