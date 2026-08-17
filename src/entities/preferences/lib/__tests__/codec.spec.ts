import { describe, expect, it } from 'vitest'
import { parsePreferences, serializePreferences } from '../codec'
import { DEFAULT_PREFERENCES } from '../persist'

describe('preferences codec', () => {
  it('defaults when payload is empty', () => {
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
  })

  it('reads amount_suggestions', () => {
    expect(parsePreferences({ amount_suggestions: false })).toEqual({ amountSuggestions: false })
  })

  it('keeps unknown keys when serializing', () => {
    expect(serializePreferences({ amountSuggestions: true }, { theme: 'dark' })).toEqual({
      theme: 'dark',
      amount_suggestions: true,
    })
  })
})
