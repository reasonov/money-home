import { nextTick, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeFormDrawer, closeSidebar, confirmAction, hideToast, track } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useExpenseRuleStore } from '@/entities/expense-rule'
import { useIncomeRuleStore } from '@/entities/income-rule'
import { usePurchaseStore } from '@/entities/purchase'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import { TOUR_STEPS } from '../model/steps'
import { useProductTourStore } from '../model/store'
import type { TourContext, TourStepDef } from '../model/types'
import { hasUpcomingEvents } from './hasUpcoming'
import { destroyTourUi, showTourHighlight } from './runTour'

function makeContext(
  path: string,
  accountCount: number,
  firstAccountId: string | null,
  hasUpcoming: boolean,
): TourContext {
  return { path, accountCount, firstAccountId, hasUpcoming }
}

function firstOpenStep(fromId: string, ctx: TourContext): TourStepDef | null {
  const from = TOUR_STEPS.findIndex((step) => step.id === fromId)
  const start = from === -1 ? 0 : from
  for (let i = start; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i]
    if (step && !step.skipIf(ctx)) {
      return step
    }
  }
  return null
}

function nextOpenStep(fromId: string, ctx: TourContext): TourStepDef | null {
  const from = TOUR_STEPS.findIndex((step) => step.id === fromId)
  for (let i = from + 1; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i]
    if (step && !step.skipIf(ctx)) {
      return step
    }
  }
  return null
}

function prevOpenStep(fromId: string, ctx: TourContext): TourStepDef | null {
  const from = TOUR_STEPS.findIndex((step) => step.id === fromId)
  for (let i = from - 1; i >= 0; i--) {
    const step = TOUR_STEPS[i]
    if (step && !step.skipIf(ctx)) {
      return step
    }
  }
  return null
}

function stepTarget(step: TourStepDef, ctx: TourContext): string | undefined {
  if (!step.to) {
    return undefined
  }
  return typeof step.to === 'function' ? step.to(ctx) : step.to
}

function visibleSteps(ctx: TourContext) {
  return TOUR_STEPS.filter((step) => !step.skipIf(ctx))
}

function waitForElement(selector: string, ms = 2000) {
  return new Promise<boolean>((resolve) => {
    if (document.querySelector(selector)) {
      resolve(true)
      return
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect()
        window.clearTimeout(timer)
        resolve(true)
      }
    })
    const timer = window.setTimeout(() => {
      observer.disconnect()
      resolve(Boolean(document.querySelector(selector)))
    }, ms)
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

export function useProductTour() {
  const tour = useProductTourStore()
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()
  const accounts = useAccountStore()
  const purchases = usePurchaseStore()
  const incomeRules = useIncomeRuleStore()
  const expenseRules = useExpenseRuleStore()
  const transactions = useTransactionStore()

  function ctx() {
    return makeContext(
      route.path,
      accounts.items.length,
      accounts.items[0]?.id ?? null,
      hasUpcomingEvents({
        selectedAccountId: accounts.selectedAccountId,
        planned: purchases.planned,
        incomeRules: incomeRules.items,
        expenseRules: expenseRules.items,
        occurrenceDatesFor: (ruleId) => transactions.occurrenceDatesFor(ruleId),
        expenseOccurrenceDatesFor: (ruleId) => transactions.expenseOccurrenceDatesFor(ruleId),
      }),
    )
  }

  let celebrating = false
  let syncGen = 0

  async function celebrateDone() {
    if (celebrating) {
      return
    }
    celebrating = true
    destroyTourUi()
    closeFormDrawer('silent')
    closeSidebar()
    tour.complete()
    track('tour_completed')
    await confirmAction({
      title: 'Обучение пройдено',
      message: 'Гайд можно снова включить в настройках.',
      confirmLabel: 'Понятно',
      cancelLabel: null,
      kind: 'success',
    })
    celebrating = false
    if (route.path !== '/') {
      await router.push({ name: 'home' })
    }
  }

  function goNext() {
    const step = nextOpenStep(tour.stepId, ctx())
    if (!step) {
      void celebrateDone()
      return
    }
    tour.setStep(step.id)
  }

  function goPrev() {
    const step = prevOpenStep(tour.stepId, ctx())
    if (!step) {
      return
    }
    tour.setStep(step.id)
  }

  async function sync() {
    const gen = ++syncGen
    if (!session.user?.id || !accounts.loaded) {
      destroyTourUi()
      return
    }

    if (tour.status === 'idle') {
      tour.start()
      return
    }

    if (tour.status !== 'active') {
      destroyTourUi()
      return
    }

    const current = ctx()
    const step = firstOpenStep(tour.stepId, current)
    if (!step) {
      void celebrateDone()
      return
    }

    if (step.id !== tour.stepId) {
      tour.setStep(step.id)
      return
    }

    if (!step.match(route.path)) {
      const target = stepTarget(step, current)
      if (target && target !== route.path) {
        await router.push(target)
        return
      }
      destroyTourUi()
      return
    }

    await nextTick()
    if (gen !== syncGen) {
      return
    }

    hideToast()
    closeSidebar()
    closeFormDrawer('silent')

    const found = await waitForElement(step.selector)
    if (gen !== syncGen) {
      return
    }
    if (!found) {
      goNext()
      return
    }

    const visible = visibleSteps(current)
    const stepIndex = visible.findIndex((item) => item.id === step.id) + 1

    showTourHighlight({
      key: step.id,
      selector: step.selector,
      title: step.title,
      description: step.description,
      showPrev: stepIndex > 1,
      nextLabel: stepIndex === visible.length ? (step.nextLabel ?? 'Готово') : step.nextLabel,
      stepIndex,
      stepTotal: visible.length,
      side: step.side,
      align: step.align,
      onSkip: () => {
        closeFormDrawer('silent')
        closeSidebar()
        tour.skip()
        track('tour_skipped')
      },
      onNext: () => {
        goNext()
      },
      onPrev: () => {
        goPrev()
      },
    })
  }

  watch(
    () => session.user?.id,
    (id) => {
      destroyTourUi()
      if (!id) {
        tour.reset()
        return
      }
      tour.load(id)
    },
    { immediate: true },
  )

  watch(
    () => [
      session.user?.id,
      accounts.loaded,
      tour.status,
      tour.stepId,
      route.path,
      accounts.items.length,
      accounts.selectedAccountId,
      purchases.planned.length,
      incomeRules.items.length,
      expenseRules.items.length,
    ],
    () => {
      void sync()
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(() => {
    destroyTourUi()
  })
}

export function replayProductTour() {
  destroyTourUi()
  useProductTourStore().replay()
}

export function resetProductTour() {
  destroyTourUi()
  useProductTourStore().reset()
}
