import { describe, expect, it } from 'vitest'
import { parsePreferences, serializePreferences } from '../codec'
import { DEFAULT_PREFERENCES } from '../persist'

describe('preferences codec', () => {
  it('defaults when payload is empty', () => {
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
  })

  it('reads amount_suggestions', () => {
    expect(parsePreferences({ amount_suggestions: false })).toEqual({
      ...DEFAULT_PREFERENCES,
      amountSuggestions: false,
    })
  })

  it('reads starter catalog flags', () => {
    expect(
      parsePreferences({
        starter_catalog_applied: true,
        starter_catalog_dismissed: true,
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      starterCatalogApplied: true,
      starterCatalogDismissed: true,
    })
  })

  it('reads bottom_nav and pads to four valid ids', () => {
    expect(parsePreferences({ bottom_nav: ['history', 'bogus', 'history', 'savings'] }).bottomNav).toEqual([
      'history',
      'savings',
      'home',
      'stats',
    ])
  })

  it('appends missing sidebar sections after valid ones', () => {
    expect(parsePreferences({ sidebar_sections: ['savings', 'bogus', 'home'] }).sidebarSections.slice(0, 3)).toEqual([
      'savings',
      'home',
      'stats',
    ])
    expect(parsePreferences({ sidebar_sections: ['savings'] }).sidebarSections).toContain('transfer')
    expect(parsePreferences({ sidebar_sections: ['savings'] }).sidebarSections).toHaveLength(
      DEFAULT_PREFERENCES.sidebarSections.length,
    )
  })

  it('treats missing sidebar_account_ids as unset', () => {
    expect(parsePreferences({}).sidebarAccountIds).toBeNull()
  })

  it('reads empty sidebar_account_ids as none pinned', () => {
    expect(parsePreferences({ sidebar_account_ids: [] }).sidebarAccountIds).toEqual([])
  })

  it('caps sidebar_account_ids at three unique strings', () => {
    expect(
      parsePreferences({ sidebar_account_ids: ['a', 'a', 1, 'b', 'c', 'd'] }).sidebarAccountIds,
    ).toEqual(['a', 'b', 'c'])
  })

  it('reads account_order', () => {
    expect(parsePreferences({ account_order: ['b', 'a', 'a', ''] }).accountOrder).toEqual(['b', 'a'])
  })

  it('keeps unknown keys when serializing', () => {
    expect(serializePreferences({ ...DEFAULT_PREFERENCES, amountSuggestions: true }, { theme: 'dark' })).toEqual({
      theme: 'dark',
      amount_suggestions: true,
      starter_catalog_applied: false,
      starter_catalog_dismissed: false,
      bottom_nav: DEFAULT_PREFERENCES.bottomNav,
      sidebar_sections: DEFAULT_PREFERENCES.sidebarSections,
      account_order: [],
    })
  })

  it('omits sidebar_account_ids when unset', () => {
    const payload = serializePreferences(DEFAULT_PREFERENCES) as Record<string, unknown>
    expect(payload).not.toHaveProperty('sidebar_account_ids')
  })

  it('writes sidebar_account_ids when set', () => {
    expect(
      serializePreferences({ ...DEFAULT_PREFERENCES, sidebarAccountIds: ['acc-1'] }),
    ).toMatchObject({ sidebar_account_ids: ['acc-1'] })
  })
})
