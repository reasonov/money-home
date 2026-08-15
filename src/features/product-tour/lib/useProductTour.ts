import { nextTick, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeFormDrawer, closeSidebar, confirmAction, hideToast, openSidebar } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useCategoryStore } from '@/entities/category'
import { useSessionStore } from '@/entities/session'
import { useTransactionStore } from '@/entities/transaction'
import { TOUR_STEPS } from '../model/steps'
import { useProductTourStore } from '../model/store'
import type { TourContext, TourStepDef } from '../model/types'
import { destroyTourUi, showTourHighlight } from './runTour'

function makeContext(
  path: string,
  accountCount: number,
  expenseCategoryCount: number,
  incomeCategoryCount: number,
  expenseCount: number,
  incomeCount: number,
  firstAccountId: string | null,
  mode: TourContext['mode'],
): TourContext {
  return {
    path,
    accountCount,
    expenseCategoryCount,
    incomeCategoryCount,
    expenseCount,
    incomeCount,
    firstAccountId,
    mode,
  }
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

function stepTarget(step: TourStepDef, ctx: TourContext): string | undefined {
  if (!step.to) {
    return undefined
  }
  return typeof step.to === 'function' ? step.to(ctx) : step.to
}

export function useProductTour() {
  const tour = useProductTourStore()
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()
  const accounts = useAccountStore()
  const categories = useCategoryStore()
  const transactions = useTransactionStore()

  function ctx() {
    return makeContext(
      route.path,
      accounts.items.length,
      categories.expense.length,
      categories.income.length,
      transactions.posted.filter((item) => item.kind === 'expense').length,
      transactions.posted.filter((item) => item.kind === 'income').length,
      accounts.items[0]?.id ?? null,
      tour.mode,
    )
  }

  let celebrating = false

  async function celebrateDone() {
    if (celebrating) {
      return
    }
    celebrating = true
    destroyTourUi()
    closeFormDrawer()
    closeSidebar()
    tour.complete()
    await confirmAction({
      title: 'Обучение пройдено',
      message: 'Поздравляем! Можно вести счета, записывать операции и планировать покупки.',
      confirmLabel: 'Приступить к работе',
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

  async function sync() {
    if (!session.user?.id || !accounts.loaded) {
      destroyTourUi()
      return
    }

    if (tour.status === 'idle' && accounts.items.length === 0) {
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
    hideToast()

    if (step.openSidebar) {
      openSidebar()
      await nextTick()
    } else {
      closeSidebar()
    }

    if (step.advanceOn !== 'submit' && step.id !== 'purchase-form') {
      closeFormDrawer()
    }

    const stepIndex = TOUR_STEPS.findIndex((item) => item.id === step.id) + 1
    const advanceOn = tour.mode === 'replay' && step.advanceOn === 'submit' ? 'next' : step.advanceOn

    showTourHighlight({
      key: `${tour.mode}:${step.id}:${advanceOn}`,
      selector: step.selector,
      title: step.title,
      description: step.description,
      showNext: advanceOn !== 'submit',
      nextLabel: step.nextLabel,
      stepIndex,
      stepTotal: TOUR_STEPS.length,
      side: step.side,
      align: step.align,
      dock: step.dock,
      onSkip: () => {
        closeFormDrawer()
        closeSidebar()
        tour.skip()
      },
      onSkipStep: () => {
        goNext()
      },
      onNext: () => {
        if (step.id === 'purchase-form') {
          void celebrateDone()
          return
        }
        goNext()
      },
      onTargetClick: advanceOn === 'click' ? () => goNext() : undefined,
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
      tour.mode,
      route.path,
      accounts.items.length,
      categories.expense.length,
      categories.income.length,
      transactions.posted.length,
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
