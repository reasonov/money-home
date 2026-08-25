import { ref, type MaybeRefOrGetter, type Ref } from 'vue'
import { moveItem, targetIndexFromY } from './pointerDrag'
import { usePointerDrag } from './usePointerDrag'

export { moveItem } from './pointerDrag'

export function usePointerReorder(options: {
  container: Ref<HTMLElement | null>
  getIds: () => string[]
  enabled?: MaybeRefOrGetter<boolean>
  onReorder: (ids: string[]) => void
  onDragEnd?: () => void
}) {
  const draggingId = ref<string | null>(null)

  function applyFromY(clientY: number) {
    const id = draggingId.value
    const root = options.container.value
    if (!id || !root) {
      return
    }
    const ids = options.getIds()
    const from = ids.indexOf(id)
    if (from < 0) {
      return
    }
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-reorder-id]')]
    const to = targetIndexFromY(
      clientY,
      nodes.map((node) => node.getBoundingClientRect()),
    )
    if (to === from) {
      return
    }
    options.onReorder(moveItem(ids, from, to))
  }

  const drag = usePointerDrag({
    enabled: options.enabled,
    scrollRoot: options.container,
    onMove(event) {
      applyFromY(event.clientY)
    },
    onEnd(_, started) {
      draggingId.value = null
      if (started) {
        options.onDragEnd?.()
      }
    },
  })

  function onPointerDown(id: string, event: PointerEvent) {
    const root = options.container.value
    const source =
      (event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('[data-reorder-id]') : null) ??
      root?.querySelector(`[data-reorder-id="${CSS.escape(id)}"]`)
    draggingId.value = id
    drag.onPointerDown(event, source instanceof HTMLElement ? source : null)
  }

  return {
    draggingId,
    dragging: drag.dragging,
    ghost: drag.ghost,
    onPointerDown,
  }
}
