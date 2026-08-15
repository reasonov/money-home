import { ref } from 'vue'
import { defineStore } from 'pinia'
import { TOUR_STEP_IDS, type PersistedTour, type TourStatus, type TourStepId } from './types'

const INITIAL_STEP: TourStepId = 'home-create'

function storageKey(userId: string) {
  return `money-home.tour.${userId}`
}

function isStepId(value: unknown): value is TourStepId {
  return typeof value === 'string' && (TOUR_STEP_IDS as readonly string[]).includes(value)
}

function isStatus(value: unknown): value is TourStatus {
  return value === 'idle' || value === 'active' || value === 'done'
}

export const useProductTourStore = defineStore('product-tour', () => {
  const status = ref<TourStatus>('idle')
  const stepId = ref<TourStepId>(INITIAL_STEP)
  const userId = ref<string | null>(null)

  function persist() {
    if (!userId.value) {
      return
    }
    const payload: PersistedTour = {
      status: status.value,
      step: stepId.value,
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
        return
      }
      const parsed = JSON.parse(raw) as Partial<PersistedTour>
      if (isStatus(parsed.status)) {
        status.value = parsed.status
        stepId.value = isStepId(parsed.step) ? parsed.step : INITIAL_STEP
        return
      }
    } catch {
      /* ignore */
    }
    status.value = 'idle'
    stepId.value = INITIAL_STEP
  }

  function start() {
    status.value = 'active'
    stepId.value = INITIAL_STEP
    persist()
  }

  function replay() {
    status.value = 'active'
    stepId.value = INITIAL_STEP
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
  }

  return {
    status,
    stepId,
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
