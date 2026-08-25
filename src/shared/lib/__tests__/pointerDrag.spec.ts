import { describe, expect, it } from 'vitest'
import { ghostPlacement, moveGhost, moveItem, targetIndexFromY } from '../pointerDrag'

describe('pointerDrag helpers', () => {
  it('moves an item between indexes', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 0, 0)).toEqual(['a', 'b'])
  })

  it('keeps grab offset inside the source rect', () => {
    const placed = ghostPlacement({ left: 10, top: 20, width: 100, height: 40 }, 30, 35)
    expect(placed.grabX).toBe(20)
    expect(placed.grabY).toBe(15)
    expect(placed.ghost).toEqual({ x: 10, y: 20, width: 100, height: 40 })
  })

  it('follows the pointer with the same grab offset', () => {
    expect(moveGhost(50, 80, 20, 15, 100, 40)).toEqual({ x: 30, y: 65, width: 100, height: 40 })
  })

  it('picks the slot whose midline the pointer crossed', () => {
    const rects = [
      { top: 0, height: 40 },
      { top: 40, height: 40 },
      { top: 80, height: 40 },
    ]
    expect(targetIndexFromY(10, rects)).toBe(0)
    expect(targetIndexFromY(45, rects)).toBe(1)
    expect(targetIndexFromY(200, rects)).toBe(2)
  })
})
