import { computed, onMounted, onUnmounted, ref, type ComputedRef } from 'vue'

export interface ChartTheme {
  text: string
  muted: string
  accent: string
  success: string
  warning: string
  border: string
  surface: string
  font: string
}

function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function readTheme(): ChartTheme {
  return {
    text: readToken('--color-text', '#0F172A'),
    muted: readToken('--color-text-muted', '#64748B'),
    accent: readToken('--color-accent', '#0F766E'),
    success: readToken('--color-success', '#15803D'),
    warning: readToken('--color-warning', '#C2410C'),
    border: readToken('--color-border', '#E2E8F0'),
    surface: readToken('--color-surface', '#FFFFFF'),
    font: readToken('--font-sans', 'Manrope, system-ui, sans-serif'),
  }
}

export function useChartTheme(): ComputedRef<ChartTheme> {
  const tick = ref(0)
  let observer: MutationObserver | undefined

  onMounted(() => {
    tick.value += 1
    observer = new MutationObserver(() => {
      tick.value += 1
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  })

  onUnmounted(() => observer?.disconnect())

  return computed(() => {
    void tick.value
    return readTheme()
  })
}
