import type { Component } from 'vue'
import {
  ArrowLeftRight,
  Bookmark,
  CalendarCheck,
  FolderTree,
  History,
  House,
  List,
  PieChart,
  PiggyBank,
  Settings,
} from '@lucide/vue'

export const NAV_ITEM_IDS = [
  'home',
  'stats',
  'calendar',
  'history',
  'categories',
  'templates',
  'savings',
  'accounts',
  'settings',
  'transfer',
] as const

export type NavItemId = (typeof NAV_ITEM_IDS)[number]

export const SIDEBAR_SECTION_IDS = [
  'home',
  'stats',
  'calendar',
  'history',
  'categories',
  'templates',
  'savings',
  'transfer',
] as const

export type SidebarSectionId = (typeof SIDEBAR_SECTION_IDS)[number]

export const DEFAULT_BOTTOM_NAV: [NavItemId, NavItemId, NavItemId, NavItemId] = [
  'home',
  'stats',
  'calendar',
  'transfer',
]

export const DEFAULT_SIDEBAR_SECTIONS: SidebarSectionId[] = [...SIDEBAR_SECTION_IDS]

export const MAX_SIDEBAR_ACCOUNTS = 3

export const BOTTOM_NAV_SLOT_COUNT = 4

const NAV_ITEM_ID_SET = new Set<string>(NAV_ITEM_IDS)
const SIDEBAR_SECTION_ID_SET = new Set<string>(SIDEBAR_SECTION_IDS)

export type NavItem = {
  id: NavItemId
  label: string
  sidebarLabel?: string
  icon: Component
  to?: string
  action?: 'transfer'
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', icon: House, to: '/' },
  { id: 'stats', label: 'Статистика', icon: PieChart, to: '/stats' },
  { id: 'calendar', label: 'Планы', icon: CalendarCheck, to: '/calendar' },
  { id: 'history', label: 'История', icon: History, to: '/history' },
  { id: 'categories', label: 'Категории', icon: FolderTree, to: '/categories' },
  { id: 'templates', label: 'Избранное', icon: Bookmark, to: '/templates' },
  { id: 'savings', label: 'Копилки', icon: PiggyBank, to: '/savings' },
  { id: 'accounts', label: 'Счета', icon: List, to: '/accounts' },
  { id: 'settings', label: 'Настройки', icon: Settings, to: '/settings' },
  { id: 'transfer', label: 'Перевод', sidebarLabel: 'Перевод между счетами', icon: ArrowLeftRight, action: 'transfer' },
]

export const NAV_ITEM_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item])) as Record<
  NavItemId,
  NavItem
>

function uniqueStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const result: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string' || !item || seen.has(item)) {
      continue
    }
    seen.add(item)
    result.push(item)
  }
  return result
}

export function isNavItemId(value: string): value is NavItemId {
  return NAV_ITEM_ID_SET.has(value)
}

export function isSidebarSectionId(value: string): value is SidebarSectionId {
  return SIDEBAR_SECTION_ID_SET.has(value)
}

export function normalizeBottomNav(raw: unknown): [NavItemId, NavItemId, NavItemId, NavItemId] {
  const result: NavItemId[] = []
  for (const item of uniqueStrings(raw)) {
    if (!isNavItemId(item)) {
      continue
    }
    result.push(item)
    if (result.length === BOTTOM_NAV_SLOT_COUNT) {
      break
    }
  }
  for (const id of DEFAULT_BOTTOM_NAV) {
    if (result.length === BOTTOM_NAV_SLOT_COUNT) {
      break
    }
    if (!result.includes(id)) {
      result.push(id)
    }
  }
  for (const id of NAV_ITEM_IDS) {
    if (result.length === BOTTOM_NAV_SLOT_COUNT) {
      break
    }
    if (!result.includes(id)) {
      result.push(id)
    }
  }
  return result as [NavItemId, NavItemId, NavItemId, NavItemId]
}

export function normalizeSidebarSections(raw: unknown): SidebarSectionId[] {
  const result: SidebarSectionId[] = []
  const seen = new Set<SidebarSectionId>()
  for (const item of uniqueStrings(raw)) {
    if (!isSidebarSectionId(item) || seen.has(item)) {
      continue
    }
    seen.add(item)
    result.push(item)
  }
  for (const id of SIDEBAR_SECTION_IDS) {
    if (!seen.has(id)) {
      result.push(id)
    }
  }
  return result
}

export function parseAccountOrder(raw: unknown): string[] {
  return uniqueStrings(raw)
}

export function parseSidebarAccountIds(obj: Record<string, unknown>): string[] | null {
  const hasSnake = 'sidebar_account_ids' in obj
  const hasCamel = 'sidebarAccountIds' in obj
  if (!hasSnake && !hasCamel) {
    return null
  }
  const raw = hasSnake ? obj.sidebar_account_ids : obj.sidebarAccountIds
  if (!Array.isArray(raw)) {
    return null
  }
  return uniqueStrings(raw).slice(0, MAX_SIDEBAR_ACCOUNTS)
}

export function assignBottomNavSlot(
  current: readonly NavItemId[],
  itemId: NavItemId,
  slot: number,
): [NavItemId, NavItemId, NavItemId, NavItemId] {
  const next = normalizeBottomNav(current)
  if (slot < 0 || slot >= BOTTOM_NAV_SLOT_COUNT) {
    return next
  }
  const existing = next.indexOf(itemId)
  if (existing === slot) {
    return next
  }
  if (existing >= 0) {
    const displaced = next[slot]
    if (displaced === undefined) {
      return next
    }
    next[slot] = itemId
    next[existing] = displaced
    return next
  }
  next[slot] = itemId
  return next
}

export function sortAccountsByOrder<T extends { id: string }>(accounts: readonly T[], order: readonly string[]): T[] {
  if (!accounts.length) {
    return []
  }
  if (!order.length) {
    return [...accounts]
  }
  const byId = new Map(accounts.map((account) => [account.id, account]))
  const seen = new Set<string>()
  const result: T[] = []
  for (const id of order) {
    const account = byId.get(id)
    if (!account || seen.has(id)) {
      continue
    }
    seen.add(id)
    result.push(account)
  }
  for (const account of accounts) {
    if (!seen.has(account.id)) {
      result.push(account)
    }
  }
  return result
}

export function resolveSidebarAccounts<T extends { id: string }>(
  accounts: readonly T[],
  order: readonly string[],
  pinned: string[] | null,
): T[] {
  const sorted = sortAccountsByOrder(accounts, order)
  if (pinned === null) {
    return sorted.slice(0, MAX_SIDEBAR_ACCOUNTS)
  }
  const pinSet = new Set(pinned)
  return sorted.filter((account) => pinSet.has(account.id)).slice(0, MAX_SIDEBAR_ACCOUNTS)
}

export function resolvePinnedAccountIds(orderedIds: readonly string[], pinned: string[] | null): string[] {
  if (pinned === null) {
    return orderedIds.slice(0, MAX_SIDEBAR_ACCOUNTS)
  }
  const known = new Set(orderedIds)
  return pinned.filter((id) => known.has(id)).slice(0, MAX_SIDEBAR_ACCOUNTS)
}

export function applyAccountOrderFromPinned(orderedIds: readonly string[], pinnedOrder: readonly string[]): string[] {
  const pinSet = new Set(pinnedOrder)
  let index = 0
  const next = orderedIds.map((id) => {
    if (!pinSet.has(id)) {
      return id
    }
    const replacement = pinnedOrder[index]
    index += 1
    return replacement ?? id
  })
  for (const id of pinnedOrder) {
    if (!orderedIds.includes(id)) {
      next.push(id)
    }
  }
  return next
}
