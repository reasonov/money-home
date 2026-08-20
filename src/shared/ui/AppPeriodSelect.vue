<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { NDatePicker, NDropdown, type DropdownOption } from 'naive-ui'
import { todayLocal } from '../lib/dates'

const PERIOD_OPTIONS = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'custom', label: 'Период' },
] as const

const props = withDefaults(
  defineProps<{
    label: string
    showAll?: boolean
  }>(),
  { showAll: false },
)

const period = defineModel<string>({ required: true })
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })

const rangeOpen = ref(false)

const menuOptions = computed<DropdownOption[]>(() => {
  const items: DropdownOption[] = PERIOD_OPTIONS.map((item) => ({
    key: item.key,
    label: item.label,
  }))
  if (props.showAll) {
    items.push({ key: 'all', label: 'За все время' })
  }
  return items
})

const rangeValue = computed({
  get: (): [string, string] | null => {
    if (!from.value || !to.value) {
      return null
    }
    return [from.value, to.value]
  },
  set: (value: [string, string] | null) => {
    if (!value?.[0] || !value[1]) {
      return
    }
    from.value = value[0]
    to.value = value[1]
  },
})

async function openRange() {
  if (!from.value) {
    from.value = todayLocal().slice(0, 8) + '01'
  }
  if (!to.value) {
    to.value = todayLocal()
  }
  await nextTick()
  rangeOpen.value = true
}

function onSelect(key: string | number) {
  const value = String(key)
  period.value = value
  if (value === 'custom') {
    void openRange()
  }
}
</script>

<template>
  <div class="period">
    <NDropdown
      trigger="click"
      placement="bottom-end"
      :options="menuOptions"
      @select="onSelect"
    >
      <button type="button" class="period__trigger" :aria-label="`Период: ${props.label}`">
        <span class="period__label">{{ props.label }}</span>
        <ChevronDown :size="16" :stroke-width="2" aria-hidden="true" />
      </button>
    </NDropdown>

    <NDatePicker
      v-model:show="rangeOpen"
      v-model:formatted-value="rangeValue"
      class="period__picker"
      type="daterange"
      format="dd.MM.yyyy"
      value-format="yyyy-MM-dd"
      placement="bottom-end"
      start-placeholder="С"
      end-placeholder="По"
      :input-readonly="true"
    />
  </div>
</template>

<style scoped>
.period {
  position: relative;
  overflow: hidden;
  flex: 0 0 9.75rem;
  width: 9.75rem;
  min-width: 9.75rem;
}

.period__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  width: 100%;
  min-height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.period__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period__trigger :deep(svg) {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.period__picker {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>

<style>
.n-date-panel--daterange {
  max-width: min(calc(100vw - 16px), 22.5rem);
}

.n-date-panel--daterange .n-date-panel-calendar--end,
.n-date-panel--daterange .n-date-panel-calendar + .n-date-panel-calendar {
  display: none;
}

.n-popover:has(.n-date-panel--daterange) {
  max-width: min(calc(100vw - 16px), 22.5rem);
}
</style>
