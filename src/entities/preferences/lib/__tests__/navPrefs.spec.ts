import { describe, expect, it } from 'vitest'
import {
  assignBottomNavSlot,
  DEFAULT_BOTTOM_NAV,
  DEFAULT_SIDEBAR_SECTIONS,
  normalizeBottomNav,
  normalizeSidebarSections,
  resolvePinnedAccountIds,
  resolveSidebarAccounts,
  sortAccountsByOrder,
} from '@/shared'

describe('appNav helpers', () => {
  it('normalizes bottom nav to four unique known ids', () => {
    expect(normalizeBottomNav(undefined)).toEqual(DEFAULT_BOTTOM_NAV)
    expect(normalizeBottomNav(['income', 'income', 'nope'])).toEqual(['income', 'home', 'stats', 'calendar'])
  })

  it('swaps an assigned bottom nav slot', () => {
    expect(assignBottomNavSlot(['home', 'stats', 'calendar', 'transfer'], 'transfer', 0)).toEqual([
      'transfer',
      'stats',
      'calendar',
      'home',
    ])
  })

  it('replaces a slot when the item is not in the bar', () => {
    expect(assignBottomNavSlot(['home', 'stats', 'calendar', 'transfer'], 'history', 2)).toEqual([
      'home',
      'stats',
      'history',
      'transfer',
    ])
  })

  it('keeps every sidebar section and prepends known custom order', () => {
    const next = normalizeSidebarSections(['transfer', 'home'])
    expect(next[0]).toBe('transfer')
    expect(next[1]).toBe('home')
    expect(next).toHaveLength(DEFAULT_SIDEBAR_SECTIONS.length)
    expect(new Set(next)).toEqual(new Set(DEFAULT_SIDEBAR_SECTIONS))
  })

  it('sorts accounts by saved order and appends unknown', () => {
    const accounts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(sortAccountsByOrder(accounts, ['c', 'a'])).toEqual([{ id: 'c' }, { id: 'a' }, { id: 'b' }])
  })

  it('defaults sidebar accounts to the first three when unset', () => {
    const accounts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    expect(resolveSidebarAccounts(accounts, [], null)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('shows no sidebar accounts when pin list is empty', () => {
    const accounts = [{ id: 'a' }, { id: 'b' }]
    expect(resolveSidebarAccounts(accounts, [], [])).toEqual([])
  })

  it('shows pinned accounts in list order', () => {
    const accounts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(resolveSidebarAccounts(accounts, ['c', 'a', 'b'], ['a', 'c'])).toEqual([{ id: 'c' }, { id: 'a' }])
  })

  it('drops missing pinned ids', () => {
    expect(resolvePinnedAccountIds(['a', 'b'], ['gone', 'b', 'a'])).toEqual(['b', 'a'])
  })
})
