export type DragGhost = {
  x: number
  y: number
  width: number
  height: number
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return [...list]
  }
  const next = [...list]
  const item = next[from]
  if (item === undefined) {
    return next
  }
  next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function ghostPlacement(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { ghost: DragGhost; grabX: number; grabY: number } {
  const width = Math.max(rect.width, 1)
  const height = Math.max(rect.height, 1)
  const grabX = Math.min(Math.max(0, clientX - rect.left), width)
  const grabY = Math.min(Math.max(0, clientY - rect.top), height)
  return {
    grabX,
    grabY,
    ghost: {
      width,
      height,
      x: clientX - grabX,
      y: clientY - grabY,
    },
  }
}

export function moveGhost(
  clientX: number,
  clientY: number,
  grabX: number,
  grabY: number,
  width: number,
  height: number,
): DragGhost {
  return {
    x: clientX - grabX,
    y: clientY - grabY,
    width,
    height,
  }
}

export function targetIndexFromY(clientY: number, rects: Array<{ top: number; height: number }>): number {
  if (!rects.length) {
    return 0
  }
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (!rect) {
      continue
    }
    if (clientY < rect.top + rect.height / 2) {
      return i
    }
  }
  return rects.length - 1
}

export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY)
    if (canScroll && node.scrollHeight > node.clientHeight + 1) {
      return node
    }
    node = node.parentElement
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement
}

export function scrollNearEdge(scroller: HTMLElement, clientY: number, zone = 48): number {
  const rect = scroller.getBoundingClientRect()
  let dy = 0
  if (clientY < rect.top + zone) {
    const t = 1 - Math.max(0, clientY - rect.top) / zone
    dy = -Math.round(4 + t * 16)
  } else if (clientY > rect.bottom - zone) {
    const t = 1 - Math.max(0, rect.bottom - clientY) / zone
    dy = Math.round(4 + t * 16)
  }
  if (!dy) {
    return 0
  }
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  const next = Math.min(max, Math.max(0, scroller.scrollTop + dy))
  const delta = next - scroller.scrollTop
  if (delta) {
    scroller.scrollTop = next
  }
  return delta
}
