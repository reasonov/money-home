import { nextTick, onBeforeUnmount, ref } from 'vue'

const AXIS_LOCK = 12
const MIN_THRESHOLD = 48
const THRESHOLD_RATIO = 0.2
const RUBBER = 0.28
const SETTLE_MS = 280

export function useHorizontalSwipe(options: {
  onSwipe: (delta: -1 | 1) => void
  canSwipe?: (delta: -1 | 1) => boolean
}) {
  const offset = ref(0)
  const dragging = ref(false)
  const settling = ref(false)
  const rootRef = ref<HTMLElement | null>(null)

  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let axis: 'x' | 'y' | null = null
  let captured = false
  let didSwipe = false
  let startTarget: HTMLElement | null = null
  let settleTimer = 0

  function paneWidth() {
    return rootRef.value?.offsetWidth ?? 0
  }

  function allowed(delta: -1 | 1) {
    return options.canSwipe?.(delta) ?? true
  }

  function consumeSwipe() {
    const value = didSwipe
    didSwipe = false
    return value
  }

  function clearPointer() {
    pointerId = null
    axis = null
    captured = false
    startTarget = null
    dragging.value = false
  }

  function releasePointer(event: PointerEvent) {
    if (captured && startTarget?.hasPointerCapture(event.pointerId)) {
      startTarget.releasePointerCapture(event.pointerId)
    }
  }

  function settleTo(to: number, done?: () => void) {
    settling.value = true
    offset.value = to
    window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      settling.value = false
      settleTimer = 0
      done?.()
    }, SETTLE_MS)
  }

  function playTurn(delta: -1 | 1, fromOffset: number) {
    const width = paneWidth()
    if (width <= 0) {
      options.onSwipe(delta)
      offset.value = 0
      return
    }
    const out = delta > 0 ? -width : width
    const runIn = () => {
      offset.value = -out
      void nextTick(() => {
        requestAnimationFrame(() => settleTo(0))
      })
    }
    if (fromOffset === out) {
      options.onSwipe(delta)
      runIn()
      return
    }
    settleTo(out, () => {
      options.onSwipe(delta)
      runIn()
    })
  }

  function animateSwipe(delta: number) {
    if (delta === 0 || settling.value || dragging.value) {
      return
    }
    const dir: -1 | 1 = delta > 0 ? 1 : -1
    if (!allowed(dir)) {
      return
    }
    didSwipe = true
    playTurn(dir, offset.value)
  }

  function isInteractive(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select'))
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || settling.value || isInteractive(event.target)) {
      return
    }
    didSwipe = false
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    axis = null
    captured = false
    startTarget = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (!axis) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
        return
      }
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis === 'y') {
        clearPointer()
        return
      }
      if (startTarget) {
        startTarget.setPointerCapture(event.pointerId)
        captured = true
      }
      dragging.value = true
    }
    if (axis !== 'x') {
      return
    }
    event.preventDefault()
    const nextDelta: -1 | 1 = dx < 0 ? 1 : -1
    offset.value = allowed(nextDelta) ? dx : dx * RUBBER
  }

  function finish(event: PointerEvent) {
    if (pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - startX
    const locked = axis
    const wasDragging = dragging.value
    releasePointer(event)
    clearPointer()
    if (!wasDragging || locked !== 'x') {
      offset.value = 0
      return
    }
    const delta: -1 | 1 = dx < 0 ? 1 : -1
    const width = paneWidth()
    const threshold = Math.max(MIN_THRESHOLD, width * THRESHOLD_RATIO)
    if (Math.abs(dx) < threshold || !allowed(delta)) {
      settleTo(0)
      return
    }
    didSwipe = true
    playTurn(delta, offset.value)
  }

  onBeforeUnmount(() => {
    window.clearTimeout(settleTimer)
    clearPointer()
  })

  return {
    rootRef,
    offset,
    dragging,
    settling,
    consumeSwipe,
    animateSwipe,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
  }
}
