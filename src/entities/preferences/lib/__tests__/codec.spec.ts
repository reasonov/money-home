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

  it('keeps unknown keys when serializing', () => {
    expect(serializePreferences({ ...DEFAULT_PREFERENCES, amountSuggestions: true }, { theme: 'dark' })).toEqual({
      theme: 'dark',
      amount_suggestions: true,
      starter_catalog_applied: false,
      starter_catalog_dismissed: false,
    })
  })
})
