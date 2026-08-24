import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS } from '../../model/types'
import {
  applyGroupRecolor,
  COLOR_FAMILIES,
  colorForJoinGroup,
  familyByBase,
  familyPalette,
  nextFreeShade,
  recolorPreservingIndex,
  resolveTone,
  shadeIndexOf,
  ungroupedPalette,
} from '../colorFamilies'

const green = familyByBase('#15803D')!

describe('colorFamilies', () => {
  it('turns CATEGORY_COLORS into family bases', () => {
    expect(ungroupedPalette()).toEqual(CATEGORY_COLORS)
    expect(COLOR_FAMILIES).toHaveLength(CATEGORY_COLORS.length)
    expect(familyPalette('#15803D', 'light')).toHaveLength(6)
    expect(new Set(familyPalette('#15803D', 'light')).size).toBe(6)
  })

  it('picks the next unused shade in the family', () => {
    const first = nextFreeShade(green, [])
    expect(first).toBe(green.light[0])
    const second = nextFreeShade(green, [first])
    expect(second).toBe(green.light[1])
    expect(nextFreeShade(green, [...green.light])).toBe(green.light[0])
  })

  it('keeps the shade index when the family base changes', () => {
    const teal = familyByBase('#0F766E')!
    const child = green.light[2]
    expect(shadeIndexOf(child, green)).toBe(2)
    expect(recolorPreservingIndex(child, green.base, teal.base)).toBe(teal.light[2])
  })

  it('recolors every child to the matching shade in the new family', () => {
    const teal = familyByBase('#0F766E')!
    const colors = applyGroupRecolor(
      [
        { color: green.light[1]! },
        { color: green.light[3]!, colorManual: true },
      ],
      green.base,
      teal.base,
    )
    expect(colors[0]).toBe(teal.light[1])
    expect(colors[1]).toBe(teal.light[3])
  })

  it('maps a shade into a group family when joining', () => {
    const teal = familyByBase('#0F766E')!
    expect(colorForJoinGroup(green.light[2]!, teal.base, [], green.base)).toBe(teal.light[2])
    expect(colorForJoinGroup(green.light[1]!, green.base, [green.light[0]!])).toBe(green.light[1])
    expect(colorForJoinGroup('#1D4ED8', green.base, [green.light[0]!])).toBe(green.light[1])
  })

  it('resolves a stored light shade for dark theme', () => {
    const stored = green.light[1]!
    expect(resolveTone(stored, 'light')).toBe(stored)
    expect(resolveTone(stored, 'dark')).toBe(green.dark[1])
  })
})
