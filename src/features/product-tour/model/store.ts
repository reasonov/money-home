import { ref } from 'vue'
import { defineStore } from 'pinia'
import { TOUR_STEP_IDS, type PersistedTour, type TourMode, type TourStatus, type TourStepId } from './types'

const INITIAL_STEP: TourStepId = 'home-accounts'

function storageKey(userId: string) {
  return `money-home.tour.${userId}`
}

function isStepId(value: unknown): value is TourStepId {
  return typeof value === 'string' && (TOUR_STEP_IDS as readonly string[]).includes(value)
}

function isStatus(value: unknown): value is TourStatus {
  return value === 'idle' || value === 'active' || value === 'done'
}

function isMode(value: unknown): value is TourMode {
  return value === 'onboarding' || value === 'replay'
}

export const useProductTourStore = defineStore('product-tour', () => {
  const status = ref<TourStatus>('idle')
  const stepId = ref<TourStepId>(INITIAL_STEP)
  const mode = ref<TourMode>('onboarding')
  const userId = ref<string | null>(null)

  function persist() {
    if (!userId.value) {
      return
    }
    const payload: PersistedTour = {
      status: status.value,
      step: stepId.value,
      mode: mode.value,
    }
    localStorage.setItem(storageKey(userId.value), JSON.stringify(payload))
  }

  function load(nextUserId: string) {
    userId.value = nextUserId
    try {
      const raw = localStorage.getItem(storageKey(nextUserId))
      if (!raw) {
        status.value = 'idle'
        stepId.value = INITIAL_STEP
        mode.value = 'onboarding'
        return
      }
      const parsed = JSON.parse(raw) as Partial<PersistedTour>
      if (isStatus(parsed.status) && isStepId(parsed.step)) {
        status.value = parsed.status
        stepId.value = parsed.step
        mode.value = isMode(parsed.mode) ? parsed.mode : 'onboarding'
        return
      }
    } catch {
      /* ignore */
    }
    status.value = 'idle'
    stepId.value = INITIAL_STEP
    mode.value = 'onboarding'
  }

  function start() {
    status.value = 'active'
    stepId.value = INITIAL_STEP
    mode.value = 'onboarding'
    persist()
  }

  function replay() {
    status.value = 'active'
    stepId.value = INITIAL_STEP
    mode.value = 'replay'
    persist()
  }

  function skip() {
    status.value = 'done'
    persist()
  }

  function complete() {
    status.value = 'done'
    persist()
  }

  function setStep(id: TourStepId) {
    stepId.value = id
    persist()
  }

  function reset() {
    userId.value = null
    status.value = 'idle'
    stepId.value = INITIAL_STEP
    mode.value = 'onboarding'
  }

  return {
    status,
    stepId,
    mode,
    userId,
    load,
    start,
    replay,
    skip,
    complete,
    setStep,
    reset,
  }
})
