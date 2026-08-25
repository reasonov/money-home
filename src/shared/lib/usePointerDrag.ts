import { onBeforeUnmount, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  findScrollParent,
  ghostPlacement,
  moveGhost,
  scrollNearEdge,
  type DragGhost,
} from './pointerDrag'

const THRESHOLD_PX = 8
const BODY_CLASS = 'is-dragging'

export function usePointerDrag(options: {
  enabled?: MaybeRefOrGetter<boolean>
  threshold?: number
  scrollRoot?: Ref<HTMLElement | null>
  onStart?: (event: PointerEvent) => void
  onMove?: (event: PointerEvent) => void
  onEnd?: (event: PointerEvent, started: boolean) => void
} = {}) {
  const dragging = ref(false)
  const ghost = ref<DragGhost | null>(null)
  let pointerId: number | null = null
  let origin: { x: number; y: number } | null = null
  let grab = { x: 0, y: 0 }
  let size = { width: 0, height: 0 }
  let sourceEl: HTMLElement | null = null
  let lastEvent: PointerEvent | null = null
  let scrollRaf = 0

  function enabled() {
    return options.enabled == null ? true : Boolean(toValue(options.enabled))
  }

  function stopScroll() {
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = 0
    }
  }

  function tickScroll() {
    if (!dragging.value || !lastEvent) {
      scrollRaf = 0
      return
    }
    const scroller = findScrollParent(options.scrollRoot?.value ?? sourceEl)
    if (scroller && scrollNearEdge(scroller, lastEvent.clientY)) {
      options.onMove?.(lastEvent)
    }
    scrollRaf = requestAnimationFrame(tickScroll)
  }

  function startDrag(event: PointerEvent) {
    dragging.value = true
    ghost.value = moveGhost(event.clientX, event.clientY, grab.x, grab.y, size.width, size.height)
    document.body.classList.add(BODY_CLASS)
    options.onStart?.(event)
    stopScroll()
    scrollRaf = requestAnimationFrame(tickScroll)
  }

  function onMove(event: PointerEvent) {
    if (pointerId !== event.pointerId || !origin) {
      return
    }
    lastEvent = event
    if (!dragging.value) {
      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      if (Math.hypot(dx, dy) < (options.threshold ?? THRESHOLD_PX)) {
        return
      }
      startDrag(event)
    }
    event.preventDefault()
    ghost.value = moveGhost(event.clientX, event.clientY, grab.x, grab.y, size.width, size.height)
    options.onMove?.(event)
  }

  function stop() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    stopScroll()
    document.body.classList.remove(BODY_CLASS)
    pointerId = null
    origin = null
    lastEvent = null
    sourceEl = null
    dragging.value = false
    ghost.value = null
  }

  function onUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) {
      return
    }
    const started = dragging.value
    stop()
    options.onEnd?.(event, started)
  }

  function onPointerDown(event: PointerEvent, source?: HTMLElement | null) {
    if (!enabled()) {
      return
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }
    const el = source ?? (event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
    if (!el) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const placed = ghostPlacement(el.getBoundingClientRect(), event.clientX, event.clientY)
    pointerId = event.pointerId
    origin = { x: event.clientX, y: event.clientY }
    grab = { x: placed.grabX, y: placed.grabY }
    size = { width: placed.ghost.width, height: placed.ghost.height }
    sourceEl = el
    lastEvent = event
    dragging.value = false
    ghost.value = null
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  onBeforeUnmount(stop)

  return { dragging, ghost, onPointerDown, stop }
}
