import { CATEGORY_COLORS } from '../model/types'
import type { ResolvedTheme } from '@/shared'

export const FAMILY_SHADE_COUNT = 6

type ShadeTuple = readonly [string, string, string, string, string, string]

export interface ColorFamily {
  base: string
  light: ShadeTuple
  dark: ShadeTuple
}

const FAMILY_SHADES: Record<string, { light: ShadeTuple; dark: ShadeTuple }> = {
  '#0F766E': {
    light: ['#0F766E', '#0D9488', '#115E59', '#14B8A6', '#134E4A', '#0B7668'],
    dark: ['#14B8A6', '#2DD4BF', '#0D9488', '#5EEAD4', '#0F766E', '#2DD4BF'],
  },
  '#15803D': {
    light: ['#15803D', '#16A34A', '#166534', '#22C55E', '#14532D', '#4D7C0F'],
    dark: ['#22C55E', '#4ADE80', '#16A34A', '#86EFAC', '#15803D', '#84CC16'],
  },
  '#C2410C': {
    light: ['#C2410C', '#EA580C', '#9A3412', '#F97316', '#7C2D12', '#B45309'],
    dark: ['#F97316', '#FB923C', '#EA580C', '#FDBA74', '#C2410C', '#F59E0B'],
  },
  '#1D4ED8': {
    light: ['#1D4ED8', '#2563EB', '#1E40AF', '#3B82F6', '#1E3A8A', '#172554'],
    dark: ['#3B82F6', '#60A5FA', '#2563EB', '#93C5FD', '#1D4ED8', '#60A5FA'],
  },
  '#7C3AED': {
    light: ['#7C3AED', '#8B5CF6', '#6D28D9', '#A78BFA', '#5B21B6', '#4C1D95'],
    dark: ['#A78BFA', '#C4B5FD', '#8B5CF6', '#DDD6FE', '#7C3AED', '#8B5CF6'],
  },
  '#DB2777': {
    light: ['#DB2777', '#EC4899', '#BE185D', '#F472B6', '#9D174D', '#831843'],
    dark: ['#F472B6', '#F9A8D4', '#EC4899', '#FBCFE8', '#DB2777', '#EC4899'],
  },
  '#CA8A04': {
    light: ['#CA8A04', '#EAB308', '#A16207', '#F59E0B', '#854D0E', '#713F12'],
    dark: ['#EAB308', '#FACC15', '#CA8A04', '#FDE047', '#A16207', '#FACC15'],
  },
  '#0E7490': {
    light: ['#0E7490', '#0891B2', '#155E75', '#06B6D4', '#164E63', '#083344'],
    dark: ['#22D3EE', '#67E8F9', '#0891B2', '#67E8F9', '#0E7490', '#22D3EE'],
  },
  '#334155': {
    light: ['#334155', '#475569', '#1E293B', '#64748B', '#0F172A', '#020617'],
    dark: ['#64748B', '#94A3B8', '#475569', '#CBD5E1', '#334155', '#94A3B8'],
  },
  '#64748B': {
    light: ['#64748B', '#475569', '#334155', '#94A3B8', '#1E293B', '#0F172A'],
    dark: ['#94A3B8', '#CBD5E1', '#64748B', '#E2E8F0', '#475569', '#94A3B8'],
  },
  '#9A3412': {
    light: ['#9A3412', '#C2410C', '#7C2D12', '#EA580C', '#431407', '#B45309'],
    dark: ['#EA580C', '#F97316', '#C2410C', '#FDBA74', '#9A3412', '#F59E0B'],
  },
  '#BE123C': {
    light: ['#BE123C', '#E11D48', '#9F1239', '#F43F5E', '#881337', '#9F1239'],
    dark: ['#F43F5E', '#FB7185', '#E11D48', '#FDA4AF', '#BE123C', '#FB7185'],
  },
  '#B91C1C': {
    light: ['#B91C1C', '#DC2626', '#991B1B', '#EF4444', '#7F1D1D', '#450A0A'],
    dark: ['#EF4444', '#F87171', '#DC2626', '#FCA5A5', '#B91C1C', '#F87171'],
  },
  '#4338CA': {
    light: ['#4338CA', '#4F46E5', '#3730A3', '#6366F1', '#312E81', '#1E1B4B'],
    dark: ['#6366F1', '#818CF8', '#4F46E5', '#A5B4FC', '#4338CA', '#818CF8'],
  },
  '#1E3A8A': {
    light: ['#1E3A8A', '#1D4ED8', '#1E40AF', '#2563EB', '#172554', '#0A1F5C'],
    dark: ['#3B82F6', '#60A5FA', '#2563EB', '#93C5FD', '#1D4ED8', '#60A5FA'],
  },
  '#047857': {
    light: ['#047857', '#059669', '#065F46', '#10B981', '#064E3B', '#022C22'],
    dark: ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857', '#34D399'],
  },
  '#3F6212': {
    light: ['#3F6212', '#4D7C0F', '#365314', '#65A30D', '#1A2E05', '#0A1203'],
    dark: ['#65A30D', '#84CC16', '#4D7C0F', '#A3E635', '#3F6212', '#84CC16'],
  },
  '#B45309': {
    light: ['#B45309', '#D97706', '#92400E', '#F59E0B', '#78350F', '#451A03'],
    dark: ['#F59E0B', '#FBBF24', '#D97706', '#FCD34D', '#B45309', '#FBBF24'],
  },
  '#0369A1': {
    light: ['#0369A1', '#0284C7', '#075985', '#0EA5E9', '#0C4A6E', '#082F49'],
    dark: ['#0EA5E9', '#38BDF8', '#0284C7', '#7DD3FC', '#0369A1', '#38BDF8'],
  },
  '#78716C': {
    light: ['#78716C', '#57534E', '#44403C', '#A8A29E', '#292524', '#1C1917'],
    dark: ['#A8A29E', '#D6D3D1', '#78716C', '#E7E5E4', '#57534E', '#D6D3D1'],
  },
}

function uniqueShades(base: string, light: ShadeTuple, dark: ShadeTuple): { light: ShadeTuple; dark: ShadeTuple } {
  const lightOut: string[] = []
  const darkOut: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < light.length; i += 1) {
    const hex = light[i]!
    if (seen.has(hex)) continue
    seen.add(hex)
    lightOut.push(hex)
    darkOut.push(dark[i] ?? hex)
  }
  if (!lightOut.includes(base)) {
    lightOut.unshift(base)
    darkOut.unshift(dark[0] ?? base)
  }
  while (lightOut.length < FAMILY_SHADE_COUNT) {
    lightOut.push(lightOut[lightOut.length - 1] ?? base)
    darkOut.push(darkOut[darkOut.length - 1] ?? base)
  }
  return {
    light: lightOut.slice(0, FAMILY_SHADE_COUNT) as unknown as ShadeTuple,
    dark: darkOut.slice(0, FAMILY_SHADE_COUNT) as unknown as ShadeTuple,
  }
}

function familyFromBase(base: string): ColorFamily {
  const raw = FAMILY_SHADES[base]
  if (!raw) {
    const fallback: ShadeTuple = [base, base, base, base, base, base]
    return { base, light: fallback, dark: fallback }
  }
  const cleaned = uniqueShades(base, raw.light, raw.dark)
  return { base, ...cleaned }
}

export const COLOR_FAMILIES: ColorFamily[] = CATEGORY_COLORS.map((base) => familyFromBase(base))

const FAMILY_BY_BASE = new Map(COLOR_FAMILIES.map((item) => [item.base.toLowerCase(), item]))

function normalizeHex(color: string): string {
  return color.trim().toUpperCase()
}

export function familyByBase(base: string): ColorFamily | undefined {
  return FAMILY_BY_BASE.get(base.trim().toLowerCase())
}

export function ungroupedPalette(): readonly string[] {
  return CATEGORY_COLORS
}

export function familyPalette(base: string, theme: ResolvedTheme = 'light'): readonly string[] {
  const family = familyByBase(base)
  if (!family) return [base]
  return theme === 'dark' ? family.dark : family.light
}

export function shadeIndexOf(color: string, family: ColorFamily): number {
  const hex = normalizeHex(color)
  const index = family.light.findIndex((item) => normalizeHex(item) === hex)
  if (index >= 0) return index
  const darkIndex = family.dark.findIndex((item) => normalizeHex(item) === hex)
  if (darkIndex >= 0) return darkIndex
  if (normalizeHex(family.base) === hex) return 0
  return 0
}

export function nextFreeShade(family: ColorFamily, usedColors: readonly string[]): string {
  const used = new Set(usedColors.map(normalizeHex))
  const free = family.light.find((item) => !used.has(normalizeHex(item)))
  return free ?? family.light[0] ?? family.base
}

export function recolorPreservingIndex(color: string, fromBase: string, toBase: string): string {
  const from = familyByBase(fromBase)
  const to = familyByBase(toBase)
  if (!to) return toBase
  if (!from) return to.light[0] ?? to.base
  const index = shadeIndexOf(color, from)
  return to.light[index] ?? to.light[0] ?? to.base
}

export function resolveTone(color: string, theme: ResolvedTheme): string {
  const hex = normalizeHex(color)
  for (const family of COLOR_FAMILIES) {
    const lightIndex = family.light.findIndex((item) => normalizeHex(item) === hex)
    if (lightIndex >= 0) {
      return theme === 'dark' ? (family.dark[lightIndex] ?? color) : family.light[lightIndex] ?? color
    }
    const darkIndex = family.dark.findIndex((item) => normalizeHex(item) === hex)
    if (darkIndex >= 0) {
      return theme === 'dark' ? (family.dark[darkIndex] ?? color) : family.light[darkIndex] ?? color
    }
    if (normalizeHex(family.base) === hex) {
      return theme === 'dark' ? (family.dark[0] ?? color) : family.light[0] ?? color
    }
  }
  return color
}

export function applyGroupRecolor(
  children: { color: string; colorManual?: boolean }[],
  fromBase: string,
  toBase: string,
): string[] {
  return children.map((child) => recolorPreservingIndex(child.color, fromBase, toBase))
}

export function colorForJoinGroup(
  color: string,
  toBase: string,
  usedColors: readonly string[],
  fromBase?: string,
): string {
  const family = familyByBase(toBase)
  if (!family) return toBase
  if (fromBase) return recolorPreservingIndex(color, fromBase, toBase)
  const hex = normalizeHex(color)
  if (family.light.some((item) => normalizeHex(item) === hex)) return color
  return nextFreeShade(family, usedColors)
}
