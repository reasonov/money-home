import { nextTick, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeFormDrawer, closeSidebar, confirmAction, hideToast } from '@/shared'
import { useAccountStore } from '@/entities/account'
import { useSessionStore } from '@/entities/session'
import { TOUR_STEPS } from '../model/steps'
import { useProductTourStore } from '../model/store'
import type { TourContext, TourStepDef } from '../model/types'
import { destroyTourUi, showTourHighlight } from './runTour'

function makeContext(
  path: string,
  accountCount: number,
  firstAccountId: string | null,
): TourContext {
  return { path, accountCount, firstAccountId }
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

  function ctx() {
    return makeContext(route.path, accounts.items.length, accounts.items[0]?.id ?? null)
  }

  let celebrating = false
  let syncGen = 0

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
    if (gen !== syncGen) {
      return
    }

    hideToast()
    closeSidebar()
    closeFormDrawer()

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
        closeFormDrawer()
        closeSidebar()
        tour.skip()
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
