import { describe, expect, it } from 'vitest'
import { formatNumericDate } from '../dates'

describe('formatNumericDate', () => {
  it('formats ISO as dd.mm.yyyy', () => {
    expect(formatNumericDate('2026-10-10')).toBe('10.10.2026')
    expect(formatNumericDate('2026-01-05')).toBe('05.01.2026')
  })
})
